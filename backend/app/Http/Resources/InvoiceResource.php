<?php

namespace App\Http\Resources;

use App\Models\Invoice;
use App\Support\Labels;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Invoice */
class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'status' => $this->status,
            'status_label' => Labels::invoiceStatus($this->status),
            'issued_at' => $this->issued_at?->toDateString(),
            'due_at' => $this->due_at?->toDateString(),
            'subtotal' => $this->subtotal,
            'discount_amount' => $this->discount_amount,
            'tax_amount' => $this->tax_amount,
            'total' => $this->total,
            'amount_paid' => $this->amount_paid,
            'balance' => $this->balance(),
            'is_overdue' => $this->due_at && $this->due_at->isPast() && $this->balance() > 0 && $this->status !== 'cancelled',
            'notes' => $this->notes,
            'client' => $this->whenLoaded('client', fn () => $this->client?->only(['id', 'display_name', 'email'])),
            'order' => $this->whenLoaded('order', fn () => $this->order?->only(['id', 'number'])),
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn ($p) => [
                'id' => $p->id, 'amount' => $p->amount, 'method' => $p->method,
                'method_label' => Labels::paymentMethod($p->method), 'paid_at' => $p->paid_at?->toDateString(),
                'reference' => $p->reference,
            ])),
            'created_at' => $this->created_at,
        ];
    }
}
