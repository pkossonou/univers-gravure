<?php

namespace App\Services;

use App\Support\Labels;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Construit les rapports sous une forme tabulaire unique
 * { title, period, kpis[], columns[], rows[][], notes[] } exportable en CSV ou PDF.
 */
class ReportService
{
    public const TYPES = [
        'financial' => 'reports.financial',
        'sales' => 'reports.sales',
        'clients' => 'reports.clients',
        'expenses' => 'reports.expenses',
        'production' => 'reports.production',
    ];

    public function __construct(private FinanceService $finance) {}

    /** @return array<string, mixed> */
    public function build(string $type, CarbonImmutable $from, CarbonImmutable $to): array
    {
        [$f, $t] = [$from->toDateString(), $to->toDateString()];
        $period = ['from' => $f, 'to' => $t];
        $m = fn ($v) => Labels::money($v);

        return match ($type) {
            'financial' => $this->financial($from, $to, $period, $m),
            'sales' => [
                'title' => 'Rapport des ventes',
                'period' => $period,
                'kpis' => [],
                'columns' => ['Commande', 'Date', 'Client', 'Statut', 'Paiement', 'Total (FCFA)'],
                'rows' => DB::table('orders as o')->join('clients as c', 'c.id', '=', 'o.client_id')
                    ->whereNull('o.deleted_at')->whereBetween('o.ordered_at', [$f, $t])->orderBy('o.ordered_at')
                    ->get(['o.number', 'o.ordered_at', 'c.company', 'c.first_name', 'c.last_name', 'o.status', 'o.payment_status', 'o.total'])
                    ->map(fn ($r) => [$r->number, $r->ordered_at, $r->company ?: trim($r->first_name.' '.$r->last_name), Labels::orderStatus($r->status), $r->payment_status, (int) $r->total])
                    ->all(),
            ],
            'clients' => [
                'title' => 'Rapport clients',
                'period' => $period,
                'kpis' => [
                    ['label' => 'Clients total', 'value' => DB::table('clients')->whereNull('deleted_at')->count()],
                    ['label' => 'Nouveaux sur la période', 'value' => DB::table('clients')->whereNull('deleted_at')->whereBetween('created_at', [$from, $to])->count()],
                ],
                'columns' => ['Client', 'Type', 'Ville', 'Commandes', 'CA facturé (FCFA)'],
                'rows' => DB::table('clients as c')
                    ->leftJoin('invoices as i', fn ($j) => $j->on('i.client_id', '=', 'c.id')->whereIn('i.status', ['issued', 'partially_paid', 'paid'])->whereBetween('i.issued_at', [$f, $t])->whereNull('i.deleted_at'))
                    ->whereNull('c.deleted_at')
                    ->groupBy('c.id', 'c.company', 'c.first_name', 'c.last_name', 'c.type', 'c.city')
                    ->selectRaw('c.id, c.company, c.first_name, c.last_name, c.type, c.city, COUNT(DISTINCT i.order_id) as orders, COALESCE(SUM(i.total), 0) as revenue')
                    ->orderByDesc('revenue')->get()
                    ->map(fn ($r) => [$r->company ?: trim($r->first_name.' '.$r->last_name), $r->type, $r->city ?? '—', (int) $r->orders, (int) $r->revenue])
                    ->all(),
            ],
            'expenses' => [
                'title' => 'Rapport des dépenses',
                'period' => $period,
                'kpis' => [['label' => 'Total dépenses', 'value' => $m(DB::table('expenses')->whereNull('deleted_at')->whereBetween('expense_date', [$f, $t])->sum('amount'))]],
                'columns' => ['Date', 'Catégorie', 'Description', 'Fournisseur', 'Paiement', 'Montant (FCFA)'],
                'rows' => DB::table('expenses as e')->join('expense_categories as c', 'c.id', '=', 'e.expense_category_id')
                    ->leftJoin('suppliers as s', 's.id', '=', 'e.supplier_id')
                    ->whereNull('e.deleted_at')->whereBetween('e.expense_date', [$f, $t])->orderBy('e.expense_date')
                    ->get(['e.expense_date', 'c.name as category', 'e.description', 's.name as supplier', 'e.payment_method', 'e.amount'])
                    ->map(fn ($r) => [$r->expense_date, $r->category, $r->description, $r->supplier ?? '—', Labels::paymentMethod($r->payment_method), (int) $r->amount])
                    ->all(),
            ],
            'production' => [
                'title' => 'Rapport de production',
                'period' => $period,
                'kpis' => [
                    ['label' => 'Ordres terminés', 'value' => DB::table('production_orders')->where('status', 'done')->whereBetween('finished_at', [$from, $to])->count()],
                    ['label' => 'En cours', 'value' => DB::table('production_orders')->whereIn('status', ['pending', 'in_progress', 'paused'])->count()],
                    ['label' => 'En retard', 'value' => DB::table('production_orders')->whereIn('status', ['pending', 'in_progress', 'paused'])->whereDate('due_at', '<', today())->count()],
                ],
                'columns' => ['OF', 'Commande', 'Statut', 'Priorité', 'Échéance', 'Démarré', 'Terminé'],
                'rows' => DB::table('production_orders as p')->join('orders as o', 'o.id', '=', 'p.order_id')
                    ->where(fn ($q) => $q->whereBetween('p.created_at', [$from, $to])->orWhereBetween('p.finished_at', [$from, $to]))
                    ->orderBy('p.due_at')
                    ->get(['p.number', 'o.number as order', 'p.status', 'p.priority', 'p.due_at', 'p.started_at', 'p.finished_at'])
                    ->map(fn ($r) => [$r->number, $r->order, $r->status, $r->priority, $r->due_at ?? '—', $r->started_at ? substr($r->started_at, 0, 10) : '—', $r->finished_at ? substr($r->finished_at, 0, 10) : '—'])
                    ->all(),
            ],
        };
    }

    private function financial(CarbonImmutable $from, CarbonImmutable $to, array $period, callable $m): array
    {
        $s = $this->finance->summary($from, $to, false);
        $series = $this->finance->timeseries($from, $to);
        $notes = [];
        if (! $s['result']['completeness']['is_complete']) {
            $missing = collect($s['result']['completeness']['missing'])->map(fn ($x) => $x['category'].' ('.$x['month'].')')->implode(', ');
            $notes[] = 'Charges récurrentes non saisies : '.$missing.'. Le résultat est donc surestimé.';
        }
        $notes[] = 'Résultat calculé sur les données saisies dans la plateforme — ce n\'est pas un bénéfice net comptable.';

        return [
            'title' => 'Rapport financier',
            'period' => $period,
            'kpis' => [
                ['label' => "Chiffre d'affaires", 'value' => $m($s['revenue']['total'])],
                ['label' => 'Dépenses', 'value' => $m($s['expenses']['total'])],
                ['label' => 'Marge brute estimée', 'value' => $m($s['gross_margin']['amount'])],
                ['label' => 'Résultat calculé', 'value' => $m($s['result']['amount'])],
                ['label' => 'Panier moyen', 'value' => $m($s['orders']['average'])],
            ],
            'columns' => ['Période', 'CA (FCFA)', 'Dépenses (FCFA)', 'Résultat (FCFA)', 'Encaissements (FCFA)'],
            'rows' => array_map(fn ($p) => [$p['bucket'], $p['revenue'], $p['expenses'], $p['result'], $p['cash_in']], $series['points']),
            'notes' => $notes,
        ];
    }
}
