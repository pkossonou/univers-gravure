<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Expense;
use App\Models\Invoice;
use App\Services\ActivityLogger;
use App\Services\InvoiceService;
use App\Services\PdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class InvoiceController extends Controller
{
    use ListsRecords;

    protected ?string $dateColumn = 'issued_at';

    public function __construct(private InvoiceService $invoices) {}

    public function index(Request $request): JsonResponse
    {
        $this->allow('invoices.view');
        $query = Invoice::query()->with(['client:id,company,first_name,last_name', 'order:id,number']);
        if ($request->boolean('overdue')) {
            $query->whereIn('status', ['issued', 'partially_paid'])->whereDate('due_at', '<', today());
        }

        return $this->paginated($this->listQuery($query, $request,
            ['issued_at', 'due_at', 'total', 'number', 'created_at'],
            ['status', 'client_id'],
            ['number'],
            '-issued_at',
        ), InvoiceResource::class, [
            'outstanding' => (int) Invoice::query()->whereIn('status', ['issued', 'partially_paid'])->sum(DB::raw('total - amount_paid')),
        ]);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        $this->allow('invoices.view');

        return response()->json(['data' => new InvoiceResource($invoice->load(['client', 'order.items', 'payments']))]);
    }

    public function issue(Invoice $invoice): JsonResponse
    {
        $this->allow('invoices.update');

        return response()->json(['data' => new InvoiceResource($this->invoices->issue($invoice))]);
    }

    public function cancel(Invoice $invoice): JsonResponse
    {
        $this->allow('invoices.update');
        abort_if($invoice->amount_paid > 0, 422, 'Une facture ayant reçu des paiements ne peut pas être annulée (émettre un avoir).');
        $invoice->update(['status' => 'cancelled']);
        ActivityLogger::log('invoice.cancelled', $invoice);

        return response()->json(['data' => new InvoiceResource($invoice)]);
    }

    public function payment(Request $request, Invoice $invoice): JsonResponse
    {
        $this->allow('invoices.update');
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1'],
            'method' => ['required', Rule::in(Expense::PAYMENT_METHODS)],
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $this->invoices->recordPayment($invoice, $data);

        return response()->json(['data' => new InvoiceResource($invoice->fresh(['client', 'payments'])), 'message' => 'Paiement enregistré.'], 201);
    }

    public function pdf(Invoice $invoice, PdfService $pdf): Response
    {
        $this->allow('invoices.view');

        return $pdf->invoice($invoice)->download($invoice->number.'.pdf');
    }
}
