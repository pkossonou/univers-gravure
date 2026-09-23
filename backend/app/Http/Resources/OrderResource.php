<?php

namespace App\Http\Resources;

use App\Models\Order;
use App\Support\Labels;
use App\Support\Timeline;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $internal = $request->is('api/v1/admin/*');

        return [
            'id' => $this->id,
            'number' => $this->number,
            'status' => $this->status,
            'status_label' => Labels::orderStatus($this->status),
            'payment_status' => $this->payment_status,
            'subtotal' => $this->subtotal,
            'discount_amount' => $this->discount_amount,
            'tax_amount' => $this->tax_amount,
            'total' => $this->total,
            'ordered_at' => $this->ordered_at?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'delivery_method' => $this->delivery_method,
            'delivery_address' => $this->delivery_address,
            'delivered_at' => $this->delivered_at,
            'completed_at' => $this->completed_at,
            'client' => $this->whenLoaded('client', fn () => $this->client?->only(['id', 'display_name', 'email', 'phone'])),
            'quote' => $this->whenLoaded('quote', fn () => $this->quote?->only(['id', 'number'])),
            'project' => $this->whenLoaded('project', fn () => $this->project?->only(['id', 'number', 'project_type', 'title'])),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($i) => array_filter([
                'id' => $i->id,
                'product_id' => $i->product_id,
                'description' => $i->description,
                'quantity' => $i->quantity,
                'unit_price' => $i->unit_price,
                'total' => $i->total,
                'options' => $i->options,
                'unit_cost' => $internal ? $i->unit_cost : false,
            ], fn ($v) => $v !== false))),
            'history' => $this->whenLoaded('statusHistory', fn () => $this->statusHistory
                ->when(! $internal, fn ($c) => $c->where('is_client_visible', true))
                ->values()
                ->map(fn ($h) => [
                    'to_status' => $h->to_status,
                    'label' => Labels::orderStatus($h->to_status),
                    'comment' => $h->comment,
                    'date' => $h->created_at,
                    'by' => $internal ? $h->user?->name : null,
                ])),
            'production' => $this->whenLoaded('productionOrders', fn () => $this->productionOrders->map(fn ($po) => [
                'id' => $po->id,
                'number' => $po->number,
                'status' => $po->status,
                'progress' => $po->progress(),
                'steps' => $po->steps
                    ->when(! $internal, fn ($c) => $c->where('is_client_visible', true))
                    ->values()
                    ->map(fn ($s) => $s->only(['id', 'name', 'status', 'completed_at'])),
            ])),
            'invoices' => $this->whenLoaded('invoices', fn () => $this->invoices->map(fn ($i) => [
                'id' => $i->id, 'number' => $i->number, 'status' => $i->status,
                'status_label' => Labels::invoiceStatus($i->status), 'total' => $i->total, 'amount_paid' => $i->amount_paid,
            ])),
            'timeline' => $this->when(
                $this->relationLoaded('project') && $this->relationLoaded('quote'),
                fn () => Timeline::build($this->project, $this->quote, $this->resource),
            ),
            $this->mergeWhen($internal, fn () => [
                'client_id' => $this->client_id,
                'cost_estimate' => $this->cost_estimate,
                'notes' => $this->notes,
                'expenses_total' => $this->whenLoaded('expenses', fn () => (int) $this->expenses->sum('amount')),
                'payments_total' => $this->whenLoaded('payments', fn () => (int) $this->payments->sum('amount')),
            ]),
            'created_at' => $this->created_at,
        ];
    }
}
