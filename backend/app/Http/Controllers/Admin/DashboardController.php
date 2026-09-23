<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Client;
use App\Models\Order;
use App\Models\ProductionOrder;
use App\Models\Project;
use App\Models\Quote;
use App\Models\StockItem;
use App\Services\FinanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Tableau de bord : lisible en quelques secondes.
 * Les indicateurs financiers ne sont renvoyés qu'aux rôles autorisés (finance.view).
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request, FinanceService $finance): JsonResponse
    {
        $this->allow('dashboard.view');
        try {
            [$from, $to] = $finance->resolvePeriod($request->query('period', 'month'), $request->query('from'), $request->query('to'));
        } catch (InvalidArgumentException $e) {
            return $this->message($e->getMessage(), 422);
        }
        [$f, $t] = [$from->toDateString(), $to->toDateString()];
        $user = $request->user();

        $data = [
            'period' => ['from' => $f, 'to' => $t],
            'operations' => [
                'clients_total' => Client::count(),
                'new_clients' => Client::whereBetween('created_at', [$from, $to])->count(),
                'new_projects' => Project::whereBetween('created_at', [$from, $to])->count(),
                'projects_to_handle' => Project::whereIn('status', ['new', 'quote_preparing'])->count(),
                'quotes_sent' => Quote::whereBetween('issued_at', [$f, $t])->whereNot('status', 'draft')->count(),
                'quotes_pending' => Quote::where('status', 'sent')->count(),
                'quotes_pending_amount' => $user->can('quotes.view') ? (int) Quote::where('status', 'sent')->sum('total') : null,
                'quote_conversion_rate' => $this->conversionRate($f, $t),
                'orders_new' => Order::whereBetween('ordered_at', [$f, $t])->whereNot('status', 'cancelled')->count(),
                'orders_in_production' => Order::whereIn('status', ['in_design', 'in_production', 'quality_check'])->count(),
                'orders_ready' => Order::where('status', 'ready')->count(),
                'orders_completed' => Order::where('status', 'completed')->whereBetween('completed_at', [$from, $to])->count(),
                'orders_late' => Order::whereIn('status', Order::OPEN_STATUSES)->whereDate('due_date', '<', today())->count(),
                'low_stock' => StockItem::query()->low()->count(),
            ],
            'top_products' => $this->topProducts($f, $t),
            'recent_projects' => ProjectResource::collection(
                Project::with(['client:id,company,first_name,last_name'])->latest()->limit(6)->get()
            )->resolve(),
            'production_due' => ProductionOrder::with(['order:id,number,client_id', 'order.client:id,company,first_name,last_name', 'steps'])
                ->whereIn('status', ['pending', 'in_progress', 'paused'])
                ->orderBy('due_at')->limit(6)->get()
                ->map(fn ($po) => [
                    'id' => $po->id, 'number' => $po->number, 'order' => $po->order?->number,
                    'client' => $po->order?->client?->display_name, 'due_at' => $po->due_at?->toDateString(),
                    'priority' => $po->priority, 'progress' => $po->progress(),
                    'is_late' => $po->due_at?->isPast() ?? false,
                ]),
            'low_stock_items' => StockItem::query()->low()->orderBy('name')->limit(6)->get(['id', 'name', 'sku', 'unit', 'quantity', 'alert_threshold']),
            'finance' => null,
        ];

        if ($user->can('finance.view')) {
            $data['finance'] = [
                'summary' => $finance->summary($from, $to),
                'timeseries' => $finance->timeseries($from, $to),
                'expenses_by_category' => $finance->breakdown($from, $to)['expenses_by_category'],
            ];
        }

        return response()->json(['data' => $data]);
    }

    private function conversionRate(string $from, string $to): ?float
    {
        $decided = Quote::whereBetween('issued_at', [$from, $to])->whereIn('status', ['accepted', 'converted', 'rejected', 'expired'])->count();
        if ($decided === 0) {
            return null;
        }
        $won = Quote::whereBetween('issued_at', [$from, $to])->whereIn('status', ['accepted', 'converted'])->count();

        return round($won / $decided * 100, 1);
    }

    /** Produits les plus demandés : demandes reçues + quantités commandées sur la période. */
    private function topProducts(string $from, string $to): array
    {
        $requests = DB::table('projects')->whereNull('deleted_at')->whereNotNull('product_id')
            ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->groupBy('product_id')->selectRaw('product_id, COUNT(*) as n')->pluck('n', 'product_id');

        $ordered = DB::table('order_items as oi')->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->whereNull('o.deleted_at')->where('o.status', '!=', 'cancelled')->whereNotNull('oi.product_id')
            ->whereBetween('o.ordered_at', [$from, $to])
            ->groupBy('oi.product_id')->selectRaw('oi.product_id, SUM(oi.quantity) as q')->pluck('q', 'product_id');

        $ids = $requests->keys()->merge($ordered->keys())->unique();
        $names = DB::table('products')->whereIn('id', $ids)->pluck('name', 'id');

        return $ids->map(fn ($id) => [
            'product_id' => $id,
            'name' => $names[$id] ?? '—',
            'requests' => (int) ($requests[$id] ?? 0),
            'ordered_quantity' => (int) ($ordered[$id] ?? 0),
        ])->sortByDesc(fn ($p) => $p['requests'] * 10 + $p['ordered_quantity'])->take(6)->values()->all();
    }
}
