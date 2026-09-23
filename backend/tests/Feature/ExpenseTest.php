<?php

namespace Tests\Feature;

use App\Models\ExpenseCategory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExpenseTest extends TestCase
{
    private function category(string $slug = 'matieres-premieres'): int
    {
        return ExpenseCategory::where('slug', $slug)->value('id');
    }

    public function test_accounting_records_an_expense_with_receipt_and_admins_are_notified(): void
    {
        Storage::fake('local');
        $admin = $this->staff('admin');
        $user = $this->actingAsStaff('comptabilite');

        $expense = $this->post('/api/v1/admin/expenses', [
            'expense_date' => today()->toDateString(),
            'expense_category_id' => $this->category(),
            'description' => 'Plaques laiton',
            'amount' => 185000,
            'payment_method' => 'bank_transfer',
            'receipt' => UploadedFile::fake()->create('facture.pdf', 120, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated()->json('data');

        $this->assertSame($user->id, $expense['recorded_by']);
        $this->assertSame(1, $admin->notifications()->where('data->type', 'new_expense')->count());
        $this->get("/api/v1/admin/expenses/{$expense['id']}/receipt")->assertOk();
    }

    public function test_future_dates_and_invalid_amounts_are_rejected(): void
    {
        $this->actingAsStaff('comptabilite');

        $this->postJson('/api/v1/admin/expenses', [
            'expense_date' => today()->addDay()->toDateString(), 'expense_category_id' => $this->category(),
            'description' => 'X', 'amount' => -5, 'payment_method' => 'bitcoin',
        ])->assertStatus(422)->assertJsonValidationErrors(['expense_date', 'amount', 'payment_method']);
    }

    public function test_list_filters_by_category_and_period_and_returns_filtered_sum(): void
    {
        $this->actingAsStaff('comptabilite');
        $make = fn ($slug, $date, $amount) => $this->postJson('/api/v1/admin/expenses', [
            'expense_date' => $date, 'expense_category_id' => $this->category($slug), 'description' => $slug,
            'amount' => $amount, 'payment_method' => 'cash',
        ])->assertCreated();

        $make('matieres-premieres', '2026-03-10', 100000);
        $make('matieres-premieres', '2026-04-10', 50000);
        $make('electricite', '2026-03-15', 30000);

        $this->getJson('/api/v1/admin/expenses?filter[expense_category_id]='.$this->category().'&date_from=2026-03-01&date_to=2026-03-31')
            ->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('meta.sum', 100000);
        $this->getJson('/api/v1/admin/expenses?date_from=2026-03-01&date_to=2026-03-31')->assertJsonPath('meta.sum', 130000);
    }

    public function test_delete_is_soft_and_audited(): void
    {
        $this->actingAsStaff('comptabilite');
        $id = $this->postJson('/api/v1/admin/expenses', [
            'expense_date' => today()->toDateString(), 'expense_category_id' => $this->category(),
            'description' => 'Erreur', 'amount' => 1000, 'payment_method' => 'cash',
        ])->json('data.id');

        $this->deleteJson("/api/v1/admin/expenses/$id")->assertOk();
        $this->assertSoftDeleted('expenses', ['id' => $id]);
        $this->assertDatabaseHas('activity_logs', ['action' => 'expense.deleted', 'subject_id' => $id]);
    }

    public function test_category_in_use_cannot_be_deleted(): void
    {
        $this->actingAsStaff('comptabilite');
        $this->postJson('/api/v1/admin/expenses', [
            'expense_date' => today()->toDateString(), 'expense_category_id' => $this->category('fournitures'),
            'description' => 'Papier', 'amount' => 1000, 'payment_method' => 'cash',
        ]);

        $this->deleteJson('/api/v1/admin/expense-categories/'.$this->category('fournitures'))->assertStatus(422);
    }
}
