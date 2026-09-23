<?php

namespace App\Services;

use App\Events\ClientCreated;
use App\Events\ProjectSubmitted;
use App\Models\Client;
use App\Models\Product;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Réception d'une demande de projet (formulaire devis, studio, configurateur, scan…). */
class ProjectService
{
    public function __construct(private NumberingService $numbering, private PricingService $pricing) {}

    /** @param array<string, mixed> $data données validées */
    public function submit(array $data, ?User $user = null, ?string $ip = null): Project
    {
        return DB::transaction(function () use ($data, $user, $ip) {
            [$client, $isNew] = $this->resolveClient($data, $user);

            $estimate = $this->pricing->estimate([
                'product_id' => $data['product_id'] ?? null,
                'project_type' => $data['project_type'],
                'quantity' => $data['quantity'] ?? 1,
                'width_mm' => $data['width_mm'] ?? null,
                'height_mm' => $data['height_mm'] ?? null,
                'material_id' => $data['material_id'] ?? null,
                'finish_id' => $data['finish_id'] ?? null,
                'size' => $data['configuration']['size'] ?? null,
                'personalizations' => $data['personalization']['modes'] ?? [],
                'has_logo' => ! empty($data['file_tokens']),
                'urgency' => $data['urgency'] ?? 'standard',
            ]);

            $project = Project::create([
                'number' => $this->numbering->next('project'),
                'client_id' => $client->id,
                'user_id' => $user?->id,
                'channel' => $data['channel'] ?? 'quote_form',
                'project_type' => $data['project_type'],
                'product_id' => $data['product_id'] ?? null,
                'material_id' => $data['material_id'] ?? null,
                'finish_id' => $data['finish_id'] ?? null,
                'contact_name' => $data['contact_name'],
                'contact_email' => strtolower($data['contact_email']),
                'contact_phone' => $data['contact_phone'] ?? null,
                'company' => $data['company'] ?? null,
                'title' => $data['title'] ?? null,
                'description' => $data['description'] ?? null,
                'quantity' => $data['quantity'] ?? 1,
                'width_mm' => $data['width_mm'] ?? null,
                'height_mm' => $data['height_mm'] ?? null,
                'depth_mm' => $data['depth_mm'] ?? null,
                'personalization' => $data['personalization'] ?? null,
                'configuration' => $data['configuration'] ?? null,
                'desired_date' => $data['desired_date'] ?? null,
                'urgency' => $data['urgency'] ?? 'standard',
                'estimate_min' => $estimate['estimate_min'],
                'estimate_max' => $estimate['estimate_max'],
                'estimate_confidence' => $estimate['confidence'],
                'status' => 'new',
                'ip_address' => $ip,
            ]);

            if (! empty($data['file_tokens'])) {
                ProjectFile::query()
                    ->whereIn('upload_token', $data['file_tokens'])
                    ->whereNull('project_id')
                    ->update(['project_id' => $project->id, 'status' => 'attached', 'upload_token' => null]);
            }

            if ($project->product_id) {
                Product::whereKey($project->product_id)->increment('requests_count');
            }

            if ($isNew) {
                ClientCreated::dispatch($client);
            }
            ProjectSubmitted::dispatch($project);

            return $project->load('files');
        });
    }

    /** @return array{0: Client, 1: bool} */
    private function resolveClient(array $data, ?User $user): array
    {
        if ($user?->client) {
            return [$user->client, false];
        }

        $email = strtolower($data['contact_email']);
        $existing = Client::query()->where('email', $email)->first();
        if ($existing) {
            return [$existing, false];
        }

        [$first, $last] = array_pad(explode(' ', trim($data['contact_name']), 2), 2, null);
        $client = Client::create([
            'user_id' => $user?->id,
            'type' => ! empty($data['company']) ? 'entreprise' : 'particulier',
            'first_name' => $first,
            'last_name' => $last,
            'company' => $data['company'] ?? null,
            'email' => $email,
            'phone' => $data['contact_phone'] ?? null,
            'city' => $data['city'] ?? null,
            'source' => 'site_web',
        ]);

        return [$client, true];
    }
}
