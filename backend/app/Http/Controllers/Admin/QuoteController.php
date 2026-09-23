<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\QuoteRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\QuoteResource;
use App\Models\Quote;
use App\Services\ActivityLogger;
use App\Services\PdfService;
use App\Services\QuoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class QuoteController extends Controller
{
    use ListsRecords;

    protected ?string $dateColumn = 'issued_at';

    public function __construct(private QuoteService $quotes) {}

    public function index(Request $request): JsonResponse
    {
        $this->allow('quotes.view');
        $query = Quote::query()->with(['client:id,company,first_name,last_name', 'project:id,number,project_type']);

        return $this->paginated($this->listQuery($query, $request,
            ['created_at', 'number', 'total', 'issued_at', 'valid_until', 'status'],
            ['status', 'client_id', 'created_by'],
            ['number'],
        ), QuoteResource::class, [
            'counts' => Quote::query()->selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status'),
            'pipeline_total' => (int) Quote::query()->where('status', 'sent')->sum('total'),
        ]);
    }

    public function show(Quote $quote): JsonResponse
    {
        $this->allow('quotes.view');

        return response()->json(['data' => new QuoteResource($quote->load(['items', 'client', 'project', 'order', 'author']))]);
    }

    public function store(QuoteRequest $request): JsonResponse
    {
        $quote = $this->quotes->save(null, $request->quoteData(), $request->validated('items'));
        ActivityLogger::log('quote.created', $quote);

        return response()->json(['data' => new QuoteResource($quote->load('items', 'client', 'project'))], 201);
    }

    public function update(QuoteRequest $request, Quote $quote): JsonResponse
    {
        $quote = $this->quotes->save($quote, $request->quoteData(), $request->validated('items'));
        ActivityLogger::log('quote.updated', $quote);

        return response()->json(['data' => new QuoteResource($quote->load('items', 'client', 'project'))]);
    }

    public function destroy(Quote $quote): JsonResponse
    {
        $this->allow('quotes.delete');
        if (! in_array($quote->status, ['draft', 'rejected', 'expired'], true)) {
            return $this->message('Seuls les brouillons, devis refusés ou expirés peuvent être supprimés.', 422);
        }
        $quote->delete();
        ActivityLogger::log('quote.deleted', $quote);

        return $this->message('Devis supprimé.');
    }

    public function send(Quote $quote): JsonResponse
    {
        $this->allow('quotes.update');

        return response()->json(['data' => new QuoteResource($this->quotes->send($quote)->load('items', 'client')), 'message' => 'Devis envoyé au client.']);
    }

    /** Validation enregistrée par l'équipe (accord téléphonique, bon de commande papier…). */
    public function accept(Quote $quote): JsonResponse
    {
        $this->allow('orders.create');
        $order = $this->quotes->accept($quote);

        return response()->json(['data' => new OrderResource($order->load('items')), 'message' => 'Commande '.$order->number.' créée.'], 201);
    }

    public function reject(Request $request, Quote $quote): JsonResponse
    {
        $this->allow('quotes.update');
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);

        return response()->json(['data' => new QuoteResource($this->quotes->reject($quote, $data['reason'] ?? null))]);
    }

    public function pdf(Quote $quote, PdfService $pdf): Response
    {
        $this->allow('quotes.view');

        return $pdf->quote($quote)->download($quote->number.'.pdf');
    }
}
