<?php

namespace App\Support;

/**
 * Catalogue des permissions et matrice rôle → permissions.
 * Source unique utilisée par le seeder, les routes et les tests.
 */
final class Permissions
{
    public const CRUD = ['view', 'create', 'update', 'delete'];

    public const MODULES = [
        'clients', 'leads', 'products', 'projects', 'quotes', 'orders', 'production', 'stock',
        'suppliers', 'expenses', 'revenues', 'invoices', 'qr_codes', 'users',
    ];

    public const EXTRA = [
        'dashboard.view',
        'finance.view',
        'reports.financial', 'reports.sales', 'reports.clients', 'reports.expenses', 'reports.production',
        'settings.manage',
        'pricing.manage',
    ];

    public const ROLE_LABELS = [
        'super_admin' => 'Super administrateur',
        'admin' => 'Administrateur',
        'commercial' => 'Commercial',
        'comptabilite' => 'Comptabilité',
        'production' => 'Production',
        'designer' => 'Designer',
        'client' => 'Client',
    ];

    /** @return list<string> */
    public static function all(): array
    {
        $all = self::EXTRA;
        foreach (self::MODULES as $module) {
            foreach (self::CRUD as $action) {
                $all[] = "$module.$action";
            }
        }

        return $all;
    }

    /** @return array<string, list<string>> */
    public static function matrix(): array
    {
        $crud = fn (string ...$modules) => array_merge(...array_map(
            fn ($m) => array_map(fn ($a) => "$m.$a", self::CRUD), $modules
        ));
        $view = fn (string ...$modules) => array_map(fn ($m) => "$m.view", $modules);

        $adminAll = array_values(array_diff(self::all(), []));

        return [
            // super_admin passe par Gate::before, la liste est indicative
            'super_admin' => $adminAll,
            'admin' => $adminAll,
            'commercial' => array_merge(
                ['dashboard.view', 'reports.sales', 'reports.clients'],
                $crud('clients', 'leads', 'projects', 'quotes', 'qr_codes'),
                ['orders.view', 'orders.create', 'orders.update'],
                $view('products', 'production', 'stock', 'invoices'),
            ),
            'comptabilite' => array_merge(
                ['dashboard.view', 'finance.view', 'reports.financial', 'reports.sales', 'reports.expenses', 'reports.clients'],
                $crud('expenses', 'revenues', 'invoices', 'suppliers'),
                $view('clients', 'products', 'projects', 'quotes', 'orders', 'stock'),
            ),
            'production' => array_merge(
                ['dashboard.view', 'reports.production', 'orders.update'],
                $crud('production', 'stock', 'qr_codes'),
                $view('products', 'projects', 'quotes', 'orders', 'suppliers'),
            ),
            'designer' => array_merge(
                ['dashboard.view', 'production.update'],
                $crud('products', 'qr_codes'),
                $view('clients', 'projects', 'quotes', 'orders', 'production'),
            ),
            'client' => [],
        ];
    }
}
