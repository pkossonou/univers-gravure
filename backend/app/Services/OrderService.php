<?php

namespace App\Services;

use App\Events\OrderStatusChanged;
use App\Models\Order;
use App\Models\ProductionOrder;
use App\Models\Quote;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(private NumberingService $numbering) {}

    public function createFromQuote(Quote $quote): Order
    {
        return DB::transaction(function () use ($quote) {
            $quote->loadMissing('items', 'project');
            $leadDays = $quote->items->map(fn ($i) => $i->product?->lead_time_max_days)->filter()->max() ?? 7;

            $order = Order::create([
                'number' => $this->numbering->next('order'),
                'client_id' => $quote->client_id,
                'quote_id' => $quote->id,
                'project_id' => $quote->project_id,
                'created_by' => auth()->id(),
                'status' => 'validated',
                'subtotal' => $quote->subtotal,
                'discount_amount' => $quote->discount_amount,
                'tax_amount' => $quote->tax_amount,
                'total' => $quote->total,
                'cost_estimate' => (int) $quote->items->sum(fn ($i) => ($i->unit_cost ?? 0) * $i->quantity),
                'ordered_at' => today(),
                'due_date' => $quote->project?->desired_date ?? today()->addWeekdays($leadDays),
            ]);

            foreach ($quote->items as $item) {
                $order->items()->create($item->only(['product_id', 'description', 'quantity', 'unit_price', 'unit_cost', 'total', 'options']));
            }

            $order->statusHistory()->create([
                'from_status' => null, 'to_status' => 'validated', 'comment' => 'Devis '.$quote->number.' validé.',
                'user_id' => auth()->id(), 'created_at' => now(),
            ]);

            $this->createProductionOrder($order);
            $quote->project?->update(['status' => 'validated']);

            ActivityLogger::log('order.created', $order, "Commande {$order->number} créée depuis {$quote->number}");
            OrderStatusChanged::dispatch($order, null, 'Votre commande est validée et planifiée.');

            return $order;
        });
    }

    public function createProductionOrder(Order $order, string $priority = 'normal'): ProductionOrder
    {
        $po = $order->productionOrders()->create([
            'number' => $this->numbering->next('production'),
            'status' => 'pending',
            'priority' => $priority,
            'due_at' => $order->due_date,
        ]);
        foreach (ProductionOrder::DEFAULT_STEPS as $i => $step) {
            $po->steps()->create($step + ['sort_order' => $i]);
        }

        return $po;
    }

    public function transition(Order $order, string $to, ?string $comment = null, bool $clientVisible = true): Order
    {
        if (! in_array($to, Order::STATUSES, true)) {
            throw ValidationException::withMessages(['status' => 'Statut inconnu.']);
        }
        if (in_array($order->status, ['completed', 'cancelled'], true)) {
            throw ValidationException::withMessages(['status' => 'Cette commande est clôturée.']);
        }
        if ($order->status === $to) {
            return $order;
        }

        return DB::transaction(function () use ($order, $to, $comment, $clientVisible) {
            $from = $order->status;
            $attrs = ['status' => $to];
            if ($to === 'delivered') {
                $attrs['delivered_at'] = now();
            }
            if ($to === 'completed') {
                $attrs['completed_at'] = now();
                $attrs['delivered_at'] = $order->delivered_at ?? now();
            }
            $order->update($attrs);

            $order->statusHistory()->create([
                'from_status' => $from, 'to_status' => $to, 'comment' => $comment,
                'is_client_visible' => $clientVisible, 'user_id' => auth()->id(), 'created_at' => now(),
            ]);

            // Synchronisation avec les ordres de production
            if (in_array($to, ['in_design', 'in_production'], true)) {
                $order->productionOrders()->where('status', 'pending')->update(['status' => 'in_progress', 'started_at' => now()]);
            }
            if (in_array($to, ['ready', 'delivered', 'completed'], true)) {
                $order->productionOrders()->whereNotIn('status', ['done', 'cancelled'])->update(['status' => 'done', 'finished_at' => now()]);
            }
            if ($to === 'cancelled') {
                $order->productionOrders()->whereNotIn('status', ['done'])->update(['status' => 'cancelled']);
            }

            ActivityLogger::log('order.status', $order, "Commande {$order->number} : $from → $to");
            OrderStatusChanged::dispatch($order, $from, $comment);

            return $order;
        });
    }
}
