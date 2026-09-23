<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\ProductionOrder;
use App\Models\ProductionStep;
use App\Services\ActivityLogger;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Atelier : tableau de production (kanban) et avancement étape par étape. */
class ProductionController extends Controller
{
    public function board(Request $request): JsonResponse
    {
        $this->allow('production.view');
        $query = ProductionOrder::query()
            ->with(['order:id,number,client_id,status,due_date,total', 'order.client:id,company,first_name,last_name', 'order.items:id,order_id,description,quantity', 'assignee:id,name', 'steps'])
            ->whereNotIn('status', ['cancelled'])
            ->where(fn ($q) => $q->where('status', '!=', 'done')->orWhere('finished_at', '>=', now()->subDays(7)));

        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->integer('assigned_to'));
        }

        $orders = $query->orderByRaw("FIELD(priority, 'urgent', 'high', 'normal', 'low')")->orderBy('due_at')->get()
            ->map(fn (ProductionOrder $po) => $po->toArray() + [
                'progress' => $po->progress(),
                'is_late' => $po->due_at && $po->due_at->isPast() && $po->status !== 'done',
                'current_step' => $po->steps->firstWhere('status', 'in_progress')?->name
                    ?? $po->steps->firstWhere('status', 'pending')?->name,
            ]);

        return response()->json(['data' => [
            'columns' => collect(ProductionOrder::STATUSES)->reject(fn ($s) => $s === 'cancelled')->values()
                ->map(fn ($s) => ['status' => $s, 'items' => $orders->where('status', $s)->values()]),
            'stats' => [
                'in_progress' => $orders->where('status', 'in_progress')->count(),
                'late' => $orders->where('is_late', true)->count(),
                'due_this_week' => $orders->filter(fn ($o) => $o['due_at'] && $o['status'] !== 'done' && now()->endOfWeek()->gte($o['due_at']))->count(),
            ],
        ]]);
    }

    public function update(Request $request, ProductionOrder $productionOrder): JsonResponse
    {
        $this->allow('production.update');
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(ProductionOrder::STATUSES)],
            'priority' => ['sometimes', Rule::in(ProductionOrder::PRIORITIES)],
            'assigned_to' => ['sometimes', 'nullable', 'exists:users,id'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        if (($data['status'] ?? null) === 'in_progress' && ! $productionOrder->started_at) {
            $data['started_at'] = now();
        }
        if (($data['status'] ?? null) === 'done') {
            $data['finished_at'] = now();
        }
        $productionOrder->update($data);
        ActivityLogger::log('production.updated', $productionOrder, null, $data);

        return response()->json(['data' => $productionOrder->fresh(['steps', 'assignee:id,name'])]);
    }

    /**
     * Avance une étape. Effets sur la commande (visibles du client) :
     *  - première étape démarrée → « En conception » / « En production »
     *  - étape contrôle qualité démarrée → « Contrôle qualité »
     *  - toutes les étapes terminées → « Prête »
     */
    public function updateStep(Request $request, ProductionStep $step, OrderService $orders): JsonResponse
    {
        $this->allow('production.update');
        $data = $request->validate([
            'status' => ['required', Rule::in(ProductionStep::STATUSES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $step->update($data + [
            'started_at' => $data['status'] === 'in_progress' ? ($step->started_at ?? now()) : $step->started_at,
            'completed_at' => $data['status'] === 'done' ? now() : null,
            'assigned_to' => $step->assigned_to ?? auth()->id(),
        ]);

        $po = $step->productionOrder()->with('steps', 'order')->first();
        $order = $po->order;
        $allDone = $po->steps->every(fn ($s) => in_array($s->status, ['done', 'skipped'], true));

        if ($allDone) {
            $po->update(['status' => 'done', 'finished_at' => now()]);
            if (in_array($order->status, ['validated', 'in_design', 'in_production', 'quality_check'], true)
                && $order->productionOrders()->where('status', '!=', 'done')->doesntExist()) {
                $orders->transition($order, 'ready', 'Votre commande est prête.');
            }
        } elseif ($data['status'] === 'in_progress') {
            if ($po->status === 'pending') {
                $po->update(['status' => 'in_progress', 'started_at' => now()]);
            }
            $target = match ($step->code) {
                'design' => 'in_design',
                'quality' => 'quality_check',
                default => 'in_production',
            };
            $rank = fn ($s) => array_search($s, Order::STATUSES, true);
            if ($rank($target) > $rank($order->status)) {
                $orders->transition($order, $target, $step->is_client_visible ? 'Étape en cours : '.$step->name.'.' : null, $step->is_client_visible);
            }
        }

        return response()->json(['data' => $po->fresh(['steps']), 'progress' => $po->fresh('steps')->progress()]);
    }
}
