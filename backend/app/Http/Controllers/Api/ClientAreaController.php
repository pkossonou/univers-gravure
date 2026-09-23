<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\QuoteResource;
use App\Models\Client;
use App\Models\ProjectFile;
use App\Services\PdfService;
use App\Services\QuoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Espace client : chaque requête est restreinte à la fiche client de l'utilisateur connecté.
 * Un identifiant appartenant à un autre client renvoie 404 (on ne révèle pas son existence).
 */
class ClientAreaController extends Controller
{
    private function client(Request $request): Client
    {
        $client = $request->user()->client;
        abort_unless($client, 403, 'Aucune fiche client associée à ce compte.');

        return $client;
    }

    public function overview(Request $request): JsonResponse
    {
        $client = $this->client($request);

        return response()->json(['data' => [
            'projects' => $client->projects()->count(),
            'open_quotes' => $client->quotes()->where('status', 'sent')->count(),
            'active_orders' => $client->orders()->whereIn('status', ['validated', 'in_design', 'in_production', 'quality_check', 'ready'])->count(),
            'balance_due' => (int) $client->invoices()->whereIn('status', ['issued', 'partially_paid'])->sum(DB::raw('total - amount_paid')),
            'recent_projects' => ProjectResource::collection(
                $client->projects()->with(['latestQuote', 'order'])->latest()->limit(3)->get()
            )->resolve(),
        ]]);
    }

    public function projects(Request $request): JsonResponse
    {
        $paginator = $this->client($request)->projects()->with(['latestQuote', 'order'])->latest()->paginate(10);

        return $this->paginated($paginator, ProjectResource::class);
    }

    public function project(Request $request, int $id): JsonResponse
    {
        $project = $this->client($request)->projects()
            ->with(['files', 'product', 'material', 'finish', 'quotes', 'latestQuote', 'order'])
            ->findOrFail($id);

        return response()->json(['data' => new ProjectResource($project)]);
    }

    public function quotes(Request $request): JsonResponse
    {
        $paginator = $this->client($request)->quotes()->where('status', '!=', 'draft')->with('project')->latest()->paginate(10);

        return $this->paginated($paginator, QuoteResource::class);
    }

    public function quote(Request $request, int $id): JsonResponse
    {
        $quote = $this->client($request)->quotes()->where('status', '!=', 'draft')->with(['items', 'project', 'order'])->findOrFail($id);

        // Le client a consulté le devis : la demande passe « en attente de validation »
        if ($quote->status === 'sent' && $quote->project?->status === 'quote_sent') {
            $quote->project->update(['status' => 'awaiting_validation']);
        }

        return response()->json(['data' => new QuoteResource($quote)]);
    }

    public function acceptQuote(Request $request, int $id, QuoteService $quotes): JsonResponse
    {
        $quote = $this->client($request)->quotes()->findOrFail($id);
        $order = $quotes->accept($quote);

        return response()->json(['message' => 'Merci ! Votre commande '.$order->number.' est lancée.', 'order_id' => $order->id]);
    }

    public function rejectQuote(Request $request, int $id, QuoteService $quotes): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);
        $quote = $this->client($request)->quotes()->findOrFail($id);
        $quotes->reject($quote, $data['reason'] ?? null);

        return $this->message('Devis refusé. Notre équipe reviendra vers vous.');
    }

    public function quotePdf(Request $request, int $id, PdfService $pdf): Response
    {
        $quote = $this->client($request)->quotes()->where('status', '!=', 'draft')->findOrFail($id);

        return $pdf->quote($quote)->download($quote->number.'.pdf');
    }

    public function orders(Request $request): JsonResponse
    {
        $paginator = $this->client($request)->orders()->with(['items', 'project', 'quote'])->latest()->paginate(10);

        return $this->paginated($paginator, OrderResource::class);
    }

    public function order(Request $request, int $id): JsonResponse
    {
        $order = $this->client($request)->orders()
            ->with(['items', 'project', 'quote', 'statusHistory', 'productionOrders.steps', 'invoices'])
            ->findOrFail($id);

        return response()->json(['data' => new OrderResource($order)]);
    }

    public function invoices(Request $request): JsonResponse
    {
        $paginator = $this->client($request)->invoices()->where('status', '!=', 'draft')->with(['order', 'payments'])->latest('issued_at')->paginate(10);

        return $this->paginated($paginator, InvoiceResource::class);
    }

    public function invoicePdf(Request $request, int $id, PdfService $pdf): Response
    {
        $invoice = $this->client($request)->invoices()->where('status', '!=', 'draft')->findOrFail($id);

        return $pdf->invoice($invoice)->download($invoice->number.'.pdf');
    }

    public function files(Request $request): JsonResponse
    {
        $projectIds = $this->client($request)->projects()->pluck('id');
        $files = ProjectFile::query()->with('project:id,number')->whereIn('project_id', $projectIds)->latest()->paginate(20);

        $files->getCollection()->transform(fn (ProjectFile $f) => [
            'id' => $f->id,
            'name' => $f->original_name,
            'kind' => $f->kind,
            'size' => $f->size,
            'extension' => $f->extension,
            'is_image' => $f->isImage(),
            'project' => $f->project?->only(['id', 'number']),
            'url' => $f->temporaryUrl(),
            'preview_url' => $f->isImage() ? $f->temporaryUrl(true) : null,
            'created_at' => $f->created_at,
        ]);

        return $this->paginated($files);
    }
}
