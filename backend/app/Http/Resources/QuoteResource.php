<?php

namespace App\Http\Resources;

use App\Models\Quote;
use App\Support\Labels;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Quote */
class QuoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $internal = $request->is('api/v1/admin/*');

        return [
            'id' => $this->id,
            'number' => $this->number,
            'status' => $this->status,
            'status_label' => Labels::quoteStatus($this->status),
            'issued_at' => $this->issued_at?->toDateString(),
            'valid_until' => $this->valid_until?->toDateString(),
            'subtotal' => $this->subtotal,
            'discount_amount' => $this->discount_amount,
            'tax_rate' => $this->tax_rate,
            'tax_amount' => $this->tax_amount,
            'total' => $this->total,
            'notes' => $this->notes,
            'terms' => $this->terms,
            'sent_at' => $this->sent_at,
            'accepted_at' => $this->accepted_at,
            'rejected_at' => $this->rejected_at,
            'rejection_reason' => $this->rejection_reason,
            'client' => $this->whenLoaded('client', fn () => $this->client?->only(['id', 'display_name', 'email', 'phone', 'company', 'address', 'city'])),
            'project' => $this->whenLoaded('project', fn () => $this->project?->only(['id', 'number', 'project_type', 'title'])),
            'order' => $this->whenLoaded('order', fn () => $this->order?->only(['id', 'number', 'status'])),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($i) => array_filter([
                'id' => $i->id,
                'product_id' => $i->product_id,
                'description' => $i->description,
                'quantity' => $i->quantity,
                'unit_price' => $i->unit_price,
                'discount' => $i->discount,
                'total' => $i->total,
                'options' => $i->options,
                'unit_cost' => $internal ? $i->unit_cost : false,
            ], fn ($v) => $v !== false))),
            $this->mergeWhen($internal, fn () => [
                'client_id' => $this->client_id,
                'project_id' => $this->project_id,
                'author' => $this->whenLoaded('author', fn () => $this->author?->only(['id', 'name'])),
                'estimated_margin' => $this->relationLoaded('items') && $this->items->every(fn ($i) => $i->unit_cost !== null)
                    ? $this->subtotal - $this->discount_amount - $this->items->sum(fn ($i) => $i->unit_cost * $i->quantity)
                    : null,
            ]),
            'created_at' => $this->created_at,
        ];
    }
}
