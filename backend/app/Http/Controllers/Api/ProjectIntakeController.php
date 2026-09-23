<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EstimateRequest;
use App\Http\Requests\SubmitProjectRequest;
use App\Http\Requests\UploadRequest;
use App\Models\Lead;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Notifications\SystemNotification;
use App\Services\FileUploadService;
use App\Services\NotificationService;
use App\Services\PricingService;
use App\Services\ProjectService;
use App\Support\Timeline;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Parcours public : estimation, envoi de fichiers, dépôt de projet, suivi, contact.
 */
class ProjectIntakeController extends Controller
{
    public function estimate(EstimateRequest $request, PricingService $pricing): JsonResponse
    {
        return response()->json(['data' => $pricing->estimate($request->validated())]);
    }

    public function upload(UploadRequest $request, FileUploadService $uploads): JsonResponse
    {
        $file = $uploads->store($request->file('file'), $request->input('kind', 'autre'), auth('sanctum')->id());

        return response()->json(['data' => [
            'token' => $file->upload_token,
            'name' => $file->original_name,
            'size' => $file->size,
            'mime_type' => $file->mime_type,
            'extension' => $file->extension,
            'kind' => $file->kind,
        ]], 201);
    }

    public function discardUpload(string $token): JsonResponse
    {
        $file = ProjectFile::query()->where('upload_token', $token)->whereNull('project_id')->firstOrFail();
        Storage::disk($file->disk)->delete($file->path);
        $file->delete();

        return $this->message('Fichier retiré.');
    }

    public function submit(SubmitProjectRequest $request, ProjectService $projects): JsonResponse
    {
        $project = $projects->submit($request->validated(), auth('sanctum')->user(), $request->ip());

        return response()->json(['data' => [
            'number' => $project->number,
            'status' => $project->status,
            'estimate' => [
                'min' => $project->estimate_min,
                'max' => $project->estimate_max,
                'confidence' => $project->estimate_confidence,
            ],
            'files_count' => $project->files->count(),
            'tracking_url' => rtrim(config('app.frontend_url'), '/').'/suivi?numero='.$project->number,
        ]], 201);
    }

    /** Suivi public : numéro + email (les deux doivent correspondre). */
    public function track(Request $request, string $number): JsonResponse
    {
        // Le demandeur prouve sa demande avec le numéro WhatsApp ou l'e-mail saisis à l'envoi
        $request->validate(['contact' => ['required', 'string', 'max:190']]);
        $contact = trim((string) $request->query('contact'));

        $project = Project::query()
            ->with(['latestQuote', 'order'])
            ->where('number', strtoupper($number))
            ->first();

        if (! $project || ! $this->contactMatches($project, $contact)) {
            return $this->message('Aucune demande ne correspond à ce numéro et à ce contact.', 404);
        }

        $quote = $project->latestQuote?->status === 'draft' ? null : $project->latestQuote;

        return response()->json(['data' => [
            'number' => $project->number,
            'project_type' => $project->project_type,
            'created_at' => $project->created_at,
            'timeline' => Timeline::build($project, $quote, $project->order),
        ]]);
    }

    /** E-mail identique, ou mêmes 8 derniers chiffres de téléphone (avec ou sans +225, espaces…). */
    private function contactMatches(Project $project, string $contact): bool
    {
        if (str_contains($contact, '@')) {
            return $project->contact_email !== null && strtolower($contact) === $project->contact_email;
        }
        $given = preg_replace('/\D/', '', $contact);
        $known = preg_replace('/\D/', '', (string) $project->contact_phone);

        return strlen($given) >= 8 && strlen($known) >= 8 && substr($given, -8) === substr($known, -8);
    }

    public function contact(Request $request, NotificationService $notifier): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:190'],
            'phone' => ['required', 'string', 'max:30', 'regex:/^[0-9+().\s-]{8,30}$/'],
            'company' => ['nullable', 'string', 'max:190'],
            'subject' => ['nullable', 'string', 'max:190'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            'website' => ['prohibited'],
        ], ['phone.required' => 'Indiquez votre numéro WhatsApp : c\'est par là que nous vous répondons.']);

        $lead = Lead::create([
            'name' => strip_tags($data['name']),
            'company' => $data['company'] ?? null,
            'email' => isset($data['email']) ? strtolower($data['email']) : null,
            'phone' => trim($data['phone']),
            'source' => 'formulaire_contact',
            'status' => 'new',
            'interest' => $data['subject'] ?? null,
            'notes' => strip_tags($data['message']),
        ]);

        $notifier->notifyTeam('leads.view', new SystemNotification(
            'new_lead', 'Nouveau message de '.$lead->name, (string) ($lead->interest ?: 'Formulaire de contact'), '/admin/prospects',
        ));

        return $this->message('Merci ! Votre message est bien arrivé, notre équipe vous recontacte.', 201);
    }
}
