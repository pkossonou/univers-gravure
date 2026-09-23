<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Client;
use App\Models\ExpenseCategory;
use App\Models\Finish;
use App\Models\Material;
use App\Models\Order;
use App\Models\Product;
use App\Models\Project;
use App\Models\Quote;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\Tag;
use App\Models\User;
use App\Support\Labels;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Paramètres, journal d'audit, listes de référence et recherche globale (⌘K). */
class SystemController extends Controller
{
    use ListsRecords;

    private const EDITABLE_SETTINGS = [
        'company.address', 'company.phone', 'company.email', 'company.whatsapp', 'company.rccm',
        'company.opening_hours', 'quotes.default_terms', 'quotes.validity_days', 'quotes.default_tax_rate',
    ];

    public function settings(): JsonResponse
    {
        $this->allow('settings.manage');

        return response()->json(['data' => Setting::query()->whereIn('key', self::EDITABLE_SETTINGS)->pluck('value', 'key')]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $this->allow('settings.manage');
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable'],
        ]);
        foreach ($data['settings'] as $key => $value) {
            if (in_array($key, self::EDITABLE_SETTINGS, true)) {
                Setting::put($key, is_string($value) ? strip_tags($value) : $value, explode('.', $key)[0]);
            }
        }

        return $this->message('Paramètres enregistrés.');
    }

    public function activity(Request $request): JsonResponse
    {
        $this->allow('users.view');

        return $this->paginated($this->listQuery(
            ActivityLog::query()->with('user:id,name'),
            $request, ['created_at'], ['action', 'user_id', 'subject_type'], ['description', 'action'],
        ));
    }

    /** Listes pour les sélecteurs du back-office. */
    public function lookups(): JsonResponse
    {
        $this->allow('dashboard.view');

        return response()->json(['data' => [
            'categories' => Category::orderBy('sort_order')->get(['id', 'name', 'slug']),
            'materials' => Material::where('is_active', true)->orderBy('name')->get(['id', 'name', 'color_hex']),
            'finishes' => Finish::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'tags' => Tag::orderBy('name')->get(['id', 'name', 'type']),
            'expense_categories' => ExpenseCategory::where('is_active', true)->orderBy('name')->get(['id', 'name', 'color', 'is_direct_cost']),
            'suppliers' => Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'staff' => User::role(User::STAFF_ROLES)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'labels' => [
                'project_types' => Labels::PROJECT_TYPES,
                'project_statuses' => Labels::PROJECT_STATUSES,
                'order_statuses' => Labels::ORDER_STATUSES,
                'quote_statuses' => Labels::QUOTE_STATUSES,
                'invoice_statuses' => Labels::INVOICE_STATUSES,
                'payment_methods' => Labels::PAYMENT_METHODS,
            ],
        ]]);
    }

    /** Recherche transverse, filtrée selon les droits de l'utilisateur. */
    public function search(Request $request): JsonResponse
    {
        $this->allow('dashboard.view');
        $term = trim((string) $request->query('q'));
        if (mb_strlen($term) < 2) {
            return response()->json(['data' => []]);
        }
        $user = $request->user();
        $like = '%'.$term.'%';
        $results = [];

        if ($user->can('clients.view')) {
            foreach (Client::search($term)->limit(5)->get() as $c) {
                $results[] = ['type' => 'client', 'label' => $c->display_name, 'hint' => $c->email ?? $c->phone, 'url' => '/admin/clients/'.$c->id];
            }
        }
        if ($user->can('projects.view')) {
            foreach (Project::search($term)->limit(5)->get() as $p) {
                $results[] = ['type' => 'demande', 'label' => $p->number, 'hint' => $p->contact_name, 'url' => '/admin/demandes/'.$p->id];
            }
        }
        if ($user->can('quotes.view')) {
            foreach (Quote::where('number', 'like', $like)->limit(5)->get() as $q) {
                $results[] = ['type' => 'devis', 'label' => $q->number, 'hint' => Labels::quoteStatus($q->status), 'url' => '/admin/devis/'.$q->id];
            }
        }
        if ($user->can('orders.view')) {
            foreach (Order::where('number', 'like', $like)->limit(5)->get() as $o) {
                $results[] = ['type' => 'commande', 'label' => $o->number, 'hint' => Labels::orderStatus($o->status), 'url' => '/admin/commandes/'.$o->id];
            }
        }
        if ($user->can('products.view')) {
            foreach (Product::search($term)->limit(5)->get() as $p) {
                $results[] = ['type' => 'produit', 'label' => $p->name, 'hint' => $p->reference, 'url' => '/admin/produits/'.$p->id];
            }
        }

        return response()->json(['data' => $results]);
    }
}
