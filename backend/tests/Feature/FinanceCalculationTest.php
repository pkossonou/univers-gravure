<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\Order;
use App\Services\FinanceService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Calculs financiers vérifiés sur plusieurs périodes avec un jeu de données maîtrisé.
 * « Aujourd'hui » est figé au 20 mai 2026.
 */
class FinanceCalculationTest extends TestCase
{
    private FinanceService $finance;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-05-20 10:00:00');
        Carbon::setTestNow('2026-05-20 10:00:00');
        $this->finance = app(FinanceService::class);
        $this->client = $this->makeClient();

        // Factures : seules émises / partiellement payées / payées comptent
        $this->invoice('2026-05-04', 500000, 'paid');
        $this->invoice('2026-05-18', 300000, 'partially_paid', 100000);
        $this->invoice('2026-05-19', 999999, 'draft');
        $this->invoice('2026-05-19', 888888, 'cancelled');
        $this->invoice('2026-04-10', 200000, 'paid');
        $this->invoice('2026-01-15', 1000000, 'paid');

        // Recettes hors facture
        $this->revenue('2026-05-20', 40000);
        $this->revenue('2026-03-02', 60000);

        // Dépenses : directes (matières) et de structure (loyer, salaires)
        $this->expense('matieres-premieres', '2026-05-06', 150000);
        $this->expense('loyer', '2026-05-05', 200000);
        $this->expense('salaires', '2026-04-28', 400000);
        $this->expense('loyer', '2026-04-05', 200000);
        $this->expense('matieres-premieres', '2026-01-20', 300000);

        // Paiements (encaissements)
        DB::table('payments')->insert([
            ['amount' => 500000, 'method' => 'cash', 'paid_at' => '2026-05-05', 'created_at' => now(), 'updated_at' => now()],
            ['amount' => 100000, 'method' => 'cash', 'paid_at' => '2026-05-18', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Commandes (panier moyen) : l'annulée est exclue
        $this->order('2026-05-02', 500000, 'completed');
        $this->order('2026-05-15', 300000, 'in_production');
        $this->order('2026-05-16', 700000, 'cancelled');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_month_summary_separates_revenue_costs_margin_and_result(): void
    {
        [$from, $to] = $this->finance->resolvePeriod('month');
        $s = $this->finance->summary($from, $to);

        $this->assertSame(['from' => '2026-05-01', 'to' => '2026-05-31'], $s['period']);
        $this->assertSame(800000, $s['revenue']['invoiced']);
        $this->assertSame(40000, $s['revenue']['other']);
        $this->assertSame(840000, $s['revenue']['total']);
        $this->assertSame(640000, $s['cash_in']);
        $this->assertSame(350000, $s['expenses']['total']);
        $this->assertSame(150000, $s['expenses']['direct']);
        $this->assertSame(200000, $s['expenses']['overhead']);
        $this->assertSame(690000, $s['gross_margin']['amount']);
        $this->assertSame(490000, $s['result']['amount']);
        $this->assertSame(58.3, $s['result']['rate']);
        $this->assertSame(2, $s['orders']['count']);
        $this->assertSame(400000, $s['orders']['average']);

        // Comparaison avec le mois d'avril (31 jours précédents)
        $this->assertSame('2026-03-31', $s['previous']['period']['from']);
        $this->assertSame(200000, $s['previous']['revenue']);
    }

    public function test_result_is_flagged_incomplete_when_recurring_charges_are_missing(): void
    {
        [$from, $to] = $this->finance->resolvePeriod('month');
        $completeness = $this->finance->summary($from, $to)['result']['completeness'];

        $this->assertFalse($completeness['is_complete']);
        $missing = collect($completeness['missing'])->pluck('category')->all();
        $this->assertContains('Salaires', $missing);
        $this->assertContains('Électricité', $missing);
        $this->assertNotContains('Loyer', $missing);
    }

    public function test_quarter_and_year_periods(): void
    {
        [$from, $to] = $this->finance->resolvePeriod('quarter');
        $this->assertSame('2026-04-01', $from->toDateString());
        $this->assertSame('2026-06-30', $to->toDateString());
        $q = $this->finance->summary($from, $to, false);
        $this->assertSame(1040000, $q['revenue']['total']);           // 800k mai + 200k avril + 40k
        $this->assertSame(950000, $q['expenses']['total']);

        [$from, $to] = $this->finance->resolvePeriod('year');
        $y = $this->finance->summary($from, $to, false);
        $this->assertSame(2100000, $y['revenue']['total']);           // + 1 000k janvier + 60k mars
        $this->assertSame(1250000, $y['expenses']['total']);
        $this->assertSame(450000, $y['expenses']['direct']);
        $this->assertSame(1650000, $y['gross_margin']['amount']);
        $this->assertSame(850000, $y['result']['amount']);
    }

    public function test_today_week_and_custom_periods(): void
    {
        [$from, $to] = $this->finance->resolvePeriod('today');
        $this->assertSame(40000, $this->finance->summary($from, $to, false)['revenue']['total']);

        [$from, $to] = $this->finance->resolvePeriod('week');       // lundi 18 → dimanche 24 mai
        $this->assertSame('2026-05-18', $from->toDateString());
        $this->assertSame(340000, $this->finance->summary($from, $to, false)['revenue']['total']);

        [$from, $to] = $this->finance->resolvePeriod('custom', '2026-01-01', '2026-03-31');
        $s = $this->finance->summary($from, $to, false);
        $this->assertSame(1060000, $s['revenue']['total']);
        $this->assertSame(300000, $s['expenses']['total']);

        $this->expectException(\InvalidArgumentException::class);
        $this->finance->resolvePeriod('custom', '2026-03-31', '2026-01-01');
    }

    public function test_timeseries_granularity_and_totals(): void
    {
        [$from, $to] = $this->finance->resolvePeriod('month');
        $series = $this->finance->timeseries($from, $to);
        $this->assertSame('day', $series['granularity']);
        $this->assertCount(31, $series['points']);
        $this->assertSame(840000, array_sum(array_column($series['points'], 'revenue')));
        $this->assertSame(350000, array_sum(array_column($series['points'], 'expenses')));

        [$from, $to] = $this->finance->resolvePeriod('year');
        $year = $this->finance->timeseries($from, $to);
        $this->assertSame('month', $year['granularity']);
        $this->assertCount(12, $year['points']);
        $may = collect($year['points'])->firstWhere('bucket', '2026-05');
        $this->assertSame(490000, $may['result']);
    }

    public function test_breakdown_by_expense_category(): void
    {
        [$from, $to] = $this->finance->resolvePeriod('year');
        $rows = collect($this->finance->breakdown($from, $to)['expenses_by_category'])->pluck('amount', 'label');

        $this->assertSame(450000, $rows['Matières premières']);
        $this->assertSame(400000, $rows['Loyer']);
        $this->assertSame(400000, $rows['Salaires']);
    }

    public function test_finance_endpoint_and_report_exports(): void
    {
        $this->actingAsStaff('comptabilite');

        $this->getJson('/api/v1/admin/finance?period=month')->assertOk()
            ->assertJsonPath('data.summary.revenue.total', 840000)
            ->assertJsonPath('data.summary.result.label', 'Résultat calculé sur les données saisies');
        $this->getJson('/api/v1/admin/finance?period=custom&from=2026-05-10')->assertStatus(422);

        $csv = $this->get('/api/v1/admin/reports/financial?period=month&format=csv');
        $csv->assertOk();
        $this->assertStringContainsString("Chiffre d'affaires", $csv->streamedContent());
        $this->get('/api/v1/admin/reports/expenses?period=year&format=pdf')->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertDatabaseHas('reports', ['type' => 'financial', 'format' => 'csv']);
    }

    private function invoice(string $date, int $total, string $status, ?int $paid = null): void
    {
        Invoice::create([
            'number' => 'FAC-T-'.uniqid(), 'client_id' => $this->client->id, 'status' => $status,
            'issued_at' => $status === 'draft' ? null : $date, 'subtotal' => $total, 'total' => $total,
            'amount_paid' => $paid ?? ($status === 'paid' ? $total : 0),
        ]);
    }

    private function revenue(string $date, int $amount): void
    {
        DB::table('revenues')->insert(['revenue_date' => $date, 'description' => 'Comptoir', 'amount' => $amount, 'source' => 'vente_comptoir', 'payment_method' => 'cash', 'created_at' => now(), 'updated_at' => now()]);
    }

    private function expense(string $slug, string $date, int $amount): void
    {
        DB::table('expenses')->insert([
            'expense_date' => $date, 'expense_category_id' => ExpenseCategory::where('slug', $slug)->value('id'),
            'description' => $slug, 'amount' => $amount, 'payment_method' => 'cash', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function order(string $date, int $total, string $status): void
    {
        Order::create(['number' => 'CMD-T-'.uniqid(), 'client_id' => $this->client->id, 'status' => $status, 'total' => $total, 'subtotal' => $total, 'ordered_at' => $date]);
    }
}
