<?php

namespace Tests\Feature;

use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Matrice des rôles : chaque rôle voit ce qui le concerne, et seulement cela. */
class PermissionTest extends TestCase
{
    public function test_commercial_manages_clients_and_quotes_but_not_finance(): void
    {
        $this->actingAsStaff('commercial');

        $this->getJson('/api/v1/admin/clients')->assertOk();
        $this->getJson('/api/v1/admin/quotes')->assertOk();
        $this->getJson('/api/v1/admin/finance')->assertForbidden();
        $this->getJson('/api/v1/admin/expenses')->assertForbidden();
        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->getJson('/api/v1/admin/reports/financial')->assertForbidden();
        $this->getJson('/api/v1/admin/reports/sales')->assertOk();
    }

    public function test_dashboard_hides_financial_indicators_from_commercial(): void
    {
        $this->actingAsStaff('commercial');
        $this->getJson('/api/v1/admin/dashboard')->assertOk()->assertJsonPath('data.finance', null);
    }

    public function test_accounting_manages_expenses_and_financial_reports(): void
    {
        $this->actingAsStaff('comptabilite');

        $this->getJson('/api/v1/admin/finance')->assertOk();
        $this->getJson('/api/v1/admin/expenses')->assertOk();
        $this->getJson('/api/v1/admin/reports/financial')->assertOk();
        $this->getJson('/api/v1/admin/dashboard')->assertOk()->assertJsonStructure(['data' => ['finance' => ['summary']]]);
        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->postJson('/api/v1/admin/clients', ['type' => 'particulier', 'first_name' => 'X'])->assertForbidden();
    }

    public function test_production_manages_workshop_only(): void
    {
        $this->actingAsStaff('production');

        $this->getJson('/api/v1/admin/production')->assertOk();
        $this->getJson('/api/v1/admin/stock-items')->assertOk();
        $this->getJson('/api/v1/admin/expenses')->assertForbidden();
        $this->getJson('/api/v1/admin/finance')->assertForbidden();
        $this->getJson('/api/v1/admin/clients')->assertForbidden();
    }

    public function test_designer_edits_products_but_cannot_touch_money(): void
    {
        $this->actingAsStaff('designer');

        $this->getJson('/api/v1/admin/products')->assertOk();
        $this->getJson('/api/v1/admin/invoices')->assertForbidden();
        $this->getJson('/api/v1/admin/pricing-rules')->assertForbidden();
    }

    public function test_super_admin_bypasses_all_checks(): void
    {
        $this->actingAsStaff('super_admin');

        foreach (['finance', 'users', 'expenses', 'pricing-rules', 'settings', 'activity', 'reports/production'] as $path) {
            $this->getJson('/api/v1/admin/'.$path)->assertOk();
        }
    }

    public function test_only_super_admin_can_grant_super_admin(): void
    {
        $this->actingAsStaff('admin');
        $this->postJson('/api/v1/admin/users', [
            'name' => 'Intrus', 'email' => 'intrus@test.example', 'role' => 'super_admin', 'password' => 'Password1234',
        ])->assertStatus(422)->assertJsonValidationErrors('role');
    }

    public function test_deactivated_staff_loses_access_immediately(): void
    {
        $user = $this->staff('admin');
        Sanctum::actingAs($user);
        $user->update(['is_active' => false]);

        $this->getJson('/api/v1/admin/clients')->assertStatus(401);
    }
}
