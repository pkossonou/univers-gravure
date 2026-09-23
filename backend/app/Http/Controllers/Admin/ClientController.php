<?php

namespace App\Http\Controllers\Admin;

use App\Events\ClientCreated;
use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ClientRequest;
use App\Models\Client;
use App\Services\ActivityLogger;
use App\Support\Labels;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientController extends Controller
{
    use ListsRecords;

    public function index(Request $request): JsonResponse
    {
        $this->allow('clients.view');

        $query = Client::query()
            ->withCount(['orders', 'quotes', 'projects'])
            ->withSum(['invoices as revenue_total' => fn ($q) => $q->whereIn('status', ['issued', 'partially_paid', 'paid'])], 'total');

        if ($request->boolean('archived')) {
            $query->onlyTrashed();
        }

        return $this->paginated($this->listQuery($query, $request,
            ['created_at', 'company', 'last_name', 'city', 'orders_count', 'revenue_total'],
            ['type', 'city', 'source', 'country'],
        ));
    }

    public function store(ClientRequest $request): JsonResponse
    {
        $client = Client::create($request->validated() + ['created_by' => auth()->id()]);
        ActivityLogger::log('client.created', $client);
        ClientCreated::dispatch($client);

        return response()->json(['data' => $client], 201);
    }

    /** Fiche 360° : coordonnées, historique commercial, chiffres clés. */
    public function show(int $id): JsonResponse
    {
        $this->allow('clients.view');
        $client = Client::withTrashed()->with('user:id,email,last_login_at')->findOrFail($id);
        $canFinance = auth()->user()->can('finance.view') || auth()->user()->can('invoices.view');

        $history = DB::table('activity_logs')
            ->where('subject_type', $client->getMorphClass())->where('subject_id', $client->id)
            ->orderByDesc('created_at')->limit(20)->get(['action', 'description', 'created_at']);

        return response()->json([
            'data' => $client,
            'projects' => $client->projects()->latest()->limit(20)->get(['id', 'number', 'project_type', 'status', 'quantity', 'estimate_min', 'created_at'])
                ->map(fn ($p) => $p->toArray() + ['status_label' => Labels::projectStatus($p->status)]),
            'quotes' => $client->quotes()->latest()->limit(20)->get(['id', 'number', 'status', 'total', 'issued_at'])
                ->map(fn ($q) => $q->toArray() + ['status_label' => Labels::quoteStatus($q->status)]),
            'orders' => $client->orders()->latest()->limit(20)->get(['id', 'number', 'status', 'payment_status', 'total', 'ordered_at'])
                ->map(fn ($o) => $o->toArray() + ['status_label' => Labels::orderStatus($o->status)]),
            'stats' => $canFinance ? [
                'revenue_total' => (int) $client->invoices()->whereIn('status', ['issued', 'partially_paid', 'paid'])->sum('total')
                    + (int) $client->revenues()->sum('amount'),
                'paid_total' => (int) $client->payments()->sum('amount'),
                'balance_due' => (int) $client->invoices()->whereIn('status', ['issued', 'partially_paid'])->sum(DB::raw('total - amount_paid')),
                'orders_count' => $client->orders()->count(),
                'first_order_at' => $client->orders()->min('ordered_at'),
            ] : null,
            'history' => $history,
        ]);
    }

    public function update(ClientRequest $request, Client $client): JsonResponse
    {
        $client->update($request->validated());
        ActivityLogger::log('client.updated', $client, null, ['changes' => array_keys($client->getChanges())]);

        return response()->json(['data' => $client]);
    }

    /** Archivage (soft delete) : l'historique commercial et comptable est conservé. */
    public function destroy(Client $client): JsonResponse
    {
        $this->allow('clients.delete');
        $client->delete();
        ActivityLogger::log('client.archived', $client);

        return $this->message('Client archivé.');
    }

    public function restore(int $id): JsonResponse
    {
        $this->allow('clients.delete');
        $client = Client::onlyTrashed()->findOrFail($id);
        $client->restore();
        ActivityLogger::log('client.restored', $client);

        return response()->json(['data' => $client, 'message' => 'Client restauré.']);
    }
}
