<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\QuoteResource;
use App\Models\Project;
use App\Services\ActivityLogger;
use App\Services\PricingService;
use App\Services\QuoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Demandes entrantes (« Devis » côté client avant chiffrage). */
class ProjectController extends Controller
{
    use ListsRecords;

    public function index(Request $request): JsonResponse
    {
        $this->allow('projects.view');
        $query = Project::query()->with(['client:id,company,first_name,last_name', 'assignee:id,name', 'product:id,name'])->withCount('files');

        return $this->paginated($this->listQuery($query, $request,
            ['created_at', 'number', 'status', 'estimate_min', 'desired_date', 'quantity'],
            ['status', 'project_type', 'channel', 'assigned_to', 'urgency', 'client_id'],
        ), ProjectResource::class, [
            'counts' => Project::query()->selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status'),
        ]);
    }

    public function show(Project $project): JsonResponse
    {
        $this->allow('projects.view');

        return response()->json(['data' => new ProjectResource(
            $project->load(['client', 'assignee', 'product', 'material', 'finish', 'files', 'quotes', 'latestQuote', 'order'])
        )]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $this->allow('projects.update');
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(Project::STATUSES)],
            'assigned_to' => ['sometimes', 'nullable', 'exists:users,id'],
            'title' => ['sometimes', 'nullable', 'string', 'max:190'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'desired_date' => ['sometimes', 'nullable', 'date'],
        ]);
        $project->update($data);
        ActivityLogger::log('project.updated', $project, null, $data);

        return response()->json(['data' => new ProjectResource($project->fresh(['client', 'assignee']))]);
    }

    /**
     * Prépare un brouillon de devis à partir de la demande : une ligne reprenant la configuration,
     * au prix estimé par le moteur tarifaire. Le commercial ajuste ensuite.
     */
    public function draftQuote(Project $project, QuoteService $quotes, PricingService $pricing): JsonResponse
    {
        $this->allow('quotes.create');
        abort_unless($project->client_id, 422, 'La demande doit être rattachée à un client.');

        $estimate = $pricing->estimate([
            'product_id' => $project->product_id,
            'project_type' => $project->project_type,
            'quantity' => $project->quantity,
            'width_mm' => $project->width_mm,
            'height_mm' => $project->height_mm,
            'material_id' => $project->material_id,
            'finish_id' => $project->finish_id,
            'size' => $project->configuration['size'] ?? null,
            'personalizations' => $project->personalization['modes'] ?? [],
            'has_logo' => $project->files()->exists(),
            'urgency' => $project->urgency,
        ]);
        $total = $estimate['estimate_min'] ?? 0;
        $unit = $project->quantity > 0 ? (int) round($total / $project->quantity) : $total;

        $description = trim(($project->product?->name ?? ucfirst($project->project_type)).' '.($project->title ? '— '.$project->title : ''));
        $options = array_filter([
            'Matériau' => $project->material?->name,
            'Finition' => $project->finish?->name,
            'Texte' => $project->personalization['text'] ?? null,
            'Dimensions' => $project->width_mm && $project->height_mm ? "{$project->width_mm} × {$project->height_mm} mm" : null,
        ]);

        $quote = $quotes->save(null, [
            'client_id' => $project->client_id,
            'project_id' => $project->id,
            'tax_rate' => 0,
            'discount_amount' => 0,
            'notes' => $estimate['confidence'] !== 'firm' ? 'Prix à confirmer : '.implode(' ', $estimate['reasons']) : null,
        ], [[
            'product_id' => $project->product_id,
            'description' => $description,
            'quantity' => $project->quantity,
            'unit_price' => $unit,
            'options' => $options ?: null,
        ]]);

        return response()->json(['data' => new QuoteResource($quote->load('items', 'client', 'project'))], 201);
    }
}
