<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceService
{
    public function __construct(private NumberingService $numbering) {}

    public function createFromOrder(Order $order, bool $issue = true): Invoice
    {
        if ($order->invoices()->whereNot('status', 'cancelled')->exists()) {
            throw ValidationException::withMessages(['order' => 'Une facture existe déjà pour cette commande.']);
        }

        $invoice = $order->invoices()->create([
            'number' => $this->numbering->next('invoice'),
            'client_id' => $order->client_id,
            'status' => $issue ? 'issued' : 'draft',
            'issued_at' => $issue ? today() : null,
            'due_at' => $issue ? today()->addDays(15) : null,
            'subtotal' => $order->subtotal,
            'discount_amount' => $order->discount_amount,
            'tax_amount' => $order->tax_amount,
            'total' => $order->total,
            'created_by' => auth()->id(),
        ]);

        // Acomptes déjà encaissés sur la commande
        $prepaid = (int) $order->payments()->whereNull('invoice_id')->sum('amount');
        if ($prepaid > 0) {
            $order->payments()->whereNull('invoice_id')->update(['invoice_id' => $invoice->id]);
            $this->refreshBalance($invoice);
        }

        ActivityLogger::log('invoice.created', $invoice, "Facture {$invoice->number}");

        return $invoice;
    }

    public function issue(Invoice $invoice): Invoice
    {
        if ($invoice->status !== 'draft') {
            throw ValidationException::withMessages(['status' => 'Seul un brouillon peut être émis.']);
        }
        $invoice->update(['status' => 'issued', 'issued_at' => today(), 'due_at' => $invoice->due_at ?? today()->addDays(15)]);

        return $invoice;
    }

    /** @param array{amount: int, method: string, paid_at: string, reference?: string|null, notes?: string|null} $data */
    public function recordPayment(Invoice $invoice, array $data): Payment
    {
        if (in_array($invoice->status, ['draft', 'cancelled'], true)) {
            throw ValidationException::withMessages(['invoice' => 'Cette facture ne peut pas recevoir de paiement.']);
        }
        if ($data['amount'] > $invoice->balance()) {
            throw ValidationException::withMessages(['amount' => 'Le montant dépasse le solde restant ('.number_format($invoice->balance(), 0, ',', ' ').' FCFA).']);
        }

        return DB::transaction(function () use ($invoice, $data) {
            $payment = $invoice->payments()->create($data + [
                'order_id' => $invoice->order_id,
                'client_id' => $invoice->client_id,
                'recorded_by' => auth()->id(),
            ]);
            $this->refreshBalance($invoice);
            ActivityLogger::log('payment.recorded', $payment, 'Paiement '.number_format($payment->amount, 0, ',', ' ').' FCFA sur '.$invoice->number);

            return $payment;
        });
    }

    public function refreshBalance(Invoice $invoice): void
    {
        $paid = (int) $invoice->payments()->sum('amount');
        $status = $paid >= $invoice->total ? 'paid' : ($paid > 0 ? 'partially_paid' : 'issued');
        $invoice->update(['amount_paid' => $paid, 'status' => $invoice->status === 'draft' ? 'draft' : $status]);

        if ($order = $invoice->order) {
            $orderPaid = (int) $order->payments()->sum('amount');
            $order->update(['payment_status' => $orderPaid >= $order->total ? 'paid' : ($orderPaid > 0 ? 'partial' : 'unpaid')]);
        }
    }
}
