<?php

namespace App\Http\Controllers\Admin;

use App\Events\ClientCreated;
use App\Models\Client;
use App\Models\Lead;
use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class LeadController extends CrudController
{
    protected string $model = Lead::class;

    protected string $permission = 'leads';

    protected array $with = ['assignee:id,name', 'convertedClient:id,company,first_name,last_name'];

    protected array $sortable = ['name', 'status', 'estimated_value', 'created_at'];

    protected array $filterable = ['status', 'source', 'assigned_to'];

    protected array $searchable = ['name', 'company', 'email', 'phone'];

    protected function rules(Request $request, ?Model $record): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'company' => ['nullable', 'string', 'max:190'],
            'email' => ['nullable', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:30'],
            'source' => ['nullable', 'string', 'max:50'],
            'status' => ['required', Rule::in(Lead::STATUSES)],
            'interest' => ['nullable', 'string', 'max:190'],
            'estimated_value' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'assigned_to' => ['nullable', 'exists:users,id'],
        ];
    }

    /** Convertit un prospect en client (fiche CRM complète). */
    public function convert(int $id): JsonResponse
    {
        $this->allow('clients.create');
        $lead = Lead::findOrFail($id);
        if ($lead->converted_client_id) {
            return $this->message('Ce prospect est déjà converti.', 422);
        }

        $client = DB::transaction(function () use ($lead) {
            [$first, $last] = array_pad(explode(' ', trim($lead->name), 2), 2, null);
            $client = Client::create([
                'type' => $lead->company ? 'entreprise' : 'particulier',
                'first_name' => $first,
                'last_name' => $last,
                'company' => $lead->company,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'source' => $lead->source ?? 'prospect',
                'notes' => $lead->notes,
                'created_by' => auth()->id(),
            ]);
            $lead->update(['status' => 'converted', 'converted_client_id' => $client->id]);

            return $client;
        });

        ActivityLogger::log('lead.converted', $lead, 'Prospect converti en client #'.$client->id);
        ClientCreated::dispatch($client);

        return response()->json(['data' => $client, 'message' => 'Prospect converti en client.'], 201);
    }
}
