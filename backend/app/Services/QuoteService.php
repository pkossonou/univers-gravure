<?php

namespace App\Services;

use App\Events\QuoteStatusChanged;
use App\Models\Order;
use App\Models\Quote;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuoteService
{
    public function __construct(private NumberingService $numbering, private OrderService $orders) {}

    /**
     * Crée ou remplace le devis et ses lignes, puis recalcule les totaux côté serveur.
     *
     * @param  array<string, mixed>  $data
     * @param  list<array<string, mixed>>  $items
     */
    public function save(?Quote $quote, array $data, array $items): Quote
    {
        return DB::transaction(function () use ($quote, $data, $items) {
            if ($quote && ! $quote->isEditable()) {
                throw ValidationException::withMessages(['status' => 'Ce devis ne peut plus être modifié.']);
            }

            $quote ??= new Quote([
                'number' => $this->numbering->next('quote'),
                'status' => 'draft',
                'created_by' => auth()->id(),
            ]);
            $quote->fill($data);
            $quote->save();

            $quote->items()->delete();
            foreach (array_values($items) as $i => $item) {
                $qty = max(1, (int) $item['quantity']);
                $unit = (int) $item['unit_price'];
                $discount = (int) ($item['discount'] ?? 0);
                $quote->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $qty,
                    'unit_price' => $unit,
                    'unit_cost' => $item['unit_cost'] ?? null,
                    'discount' => $discount,
                    'total' => max(0, $qty * $unit - $discount),
                    'options' => $item['options'] ?? null,
                    'sort_order' => $i,
                ]);
            }

            $this->recalculate($quote);

            if ($quote->project && $quote->project->status === 'new') {
                $quote->project->update(['status' => 'quote_preparing']);
            }

            return $quote->fresh(['items', 'client']);
        });
    }

    public function recalculate(Quote $quote): void
    {
        $subtotal = (int) $quote->items()->sum('total');
        $discount = min($subtotal, (int) $quote->discount_amount);
        $tax = (int) round(($subtotal - $discount) * ((float) $quote->tax_rate) / 100);

        $quote->update([
            'subtotal' => $subtotal,
            'discount_amount' => $discount,
            'tax_amount' => $tax,
            'total' => $subtotal - $discount + $tax,
        ]);
    }

    public function send(Quote $quote): Quote
    {
        if (! in_array($quote->status, ['draft', 'sent'], true)) {
            throw ValidationException::withMessages(['status' => 'Seul un brouillon peut être envoyé.']);
        }
        if ($quote->items()->count() === 0) {
            throw ValidationException::withMessages(['items' => 'Le devis doit contenir au moins une ligne.']);
        }

        $from = $quote->status;
        $quote->update([
            'status' => 'sent',
            'sent_at' => now(),
            'issued_at' => $quote->issued_at ?? today(),
            'valid_until' => $quote->valid_until ?? today()->addDays(30),
        ]);
        $quote->project?->update(['status' => 'quote_sent']);

        ActivityLogger::log('quote.sent', $quote, "Devis {$quote->number} envoyé");
        QuoteStatusChanged::dispatch($quote, $from);

        return $quote;
    }

    /** Acceptation (client ou équipe) : le devis devient une commande. */
    public function accept(Quote $quote): Order
    {
        if ($quote->status !== 'sent') {
            throw ValidationException::withMessages(['status' => "Ce devis n'est pas en attente de validation."]);
        }
        if ($quote->valid_until && $quote->valid_until->isPast() && ! $quote->valid_until->isToday()) {
            $quote->update(['status' => 'expired']);
            throw ValidationException::withMessages(['status' => 'Ce devis a expiré. Contactez-nous pour le renouveler.']);
        }

        return DB::transaction(function () use ($quote) {
            $quote->update(['status' => 'accepted', 'accepted_at' => now()]);
            ActivityLogger::log('quote.accepted', $quote, "Devis {$quote->number} accepté");
            QuoteStatusChanged::dispatch($quote, 'sent');

            $order = $this->orders->createFromQuote($quote);
            $quote->update(['status' => 'converted']);

            return $order;
        });
    }

    public function reject(Quote $quote, ?string $reason): Quote
    {
        if ($quote->status !== 'sent') {
            throw ValidationException::withMessages(['status' => "Ce devis n'est pas en attente de validation."]);
        }
        $quote->update(['status' => 'rejected', 'rejected_at' => now(), 'rejection_reason' => $reason]);
        $quote->project?->update(['status' => 'rejected']);
        ActivityLogger::log('quote.rejected', $quote, "Devis {$quote->number} refusé", ['reason' => $reason]);
        QuoteStatusChanged::dispatch($quote, 'sent');

        return $quote;
    }
}
