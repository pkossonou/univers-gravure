<?php

namespace App\Http\Requests;

use App\Models\Product;
use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'contact_name' => is_string($this->contact_name) ? strip_tags(trim($this->contact_name)) : $this->contact_name,
            'description' => is_string($this->description) ? strip_tags($this->description) : $this->description,
        ]);
    }

    public function rules(): array
    {
        return [
            'channel' => ['nullable', Rule::in(array_diff(Project::CHANNELS, ['admin']))],
            'project_type' => ['required', Rule::in(Project::TYPES)],
            'product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('status', 'published')],
            'material_id' => ['nullable', 'integer', 'exists:materials,id'],
            'finish_id' => ['nullable', 'integer', 'exists:finishes,id'],

            'contact_name' => ['required', 'string', 'min:2', 'max:120'],
            'contact_email' => ['required', 'email:rfc', 'max:190'],
            'contact_phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+().\s-]{6,30}$/'],
            'company' => ['nullable', 'string', 'max:190'],
            'city' => ['nullable', 'string', 'max:100'],

            'title' => ['nullable', 'string', 'max:190'],
            'description' => ['nullable', 'string', 'max:5000'],
            'quantity' => ['required', 'integer', 'min:1', 'max:100000'],
            'width_mm' => ['nullable', 'integer', 'min:5', 'max:20000'],
            'height_mm' => ['nullable', 'integer', 'min:5', 'max:20000'],
            'depth_mm' => ['nullable', 'integer', 'min:1', 'max:5000'],

            'personalization' => ['nullable', 'array'],
            'personalization.modes' => ['nullable', 'array', 'max:5'],
            'personalization.modes.*' => ['string', Rule::in(Product::PERSONALIZATIONS)],
            'personalization.text' => ['nullable', 'string', 'max:300'],
            'personalization.lines' => ['nullable', 'array', 'max:6'],
            'personalization.lines.*' => ['nullable', 'string', 'max:120'],
            'personalization.font' => ['nullable', 'string', 'max:50'],
            'personalization.color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'personalization.align' => ['nullable', Rule::in(['left', 'center', 'right'])],
            'personalization.placement' => ['nullable', 'string', 'max:50'],
            'personalization.size' => ['nullable', 'numeric', 'min:0.2', 'max:3'],

            // Configurateur : structure libre mais bornée (clé/valeurs scalaires)
            'configuration' => ['nullable', 'array', 'max:30'],
            'configuration.*' => ['nullable'],

            'desired_date' => ['nullable', 'date', 'after_or_equal:today'],
            'urgency' => ['nullable', Rule::in(Project::URGENCIES)],

            // « J'ai une photo du modèle » : au moins une photo est indispensable
            'file_tokens' => ['required_if:channel,photo_model', 'nullable', 'array', 'max:10'],
            'file_tokens.*' => ['string', 'size:48', Rule::exists('project_files', 'upload_token')->whereNull('project_id')],

            'consent' => ['accepted'],
            // Pot de miel anti-robot : doit rester vide
            'website' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'consent.accepted' => 'Merci d\'accepter d\'être recontacté au sujet de votre projet.',
            'file_tokens.required_if' => 'Ajoutez au moins une photo du modèle souhaité.',
            'file_tokens.*.exists' => 'Un fichier envoyé a expiré ; merci de le téléverser à nouveau.',
            'desired_date.after_or_equal' => 'La date souhaitée ne peut pas être dans le passé.',
        ];
    }
}
