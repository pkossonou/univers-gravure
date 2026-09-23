<?php

namespace App\Http\Requests;

use App\Models\ProjectFile;
use App\Services\FileUploadService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Première barrière (extension + taille) ; le type MIME réel est revérifié par FileUploadService
            'file' => ['required', 'file', 'max:'.config('app.upload_max_kb'), 'extensions:'.implode(',', array_keys(FileUploadService::ALLOWED))],
            'kind' => ['nullable', Rule::in(ProjectFile::KINDS)],
        ];
    }

    public function messages(): array
    {
        return [
            'file.max' => 'Le fichier dépasse la taille maximale de '.round(config('app.upload_max_kb') / 1024).' Mo.',
            'file.extensions' => 'Formats acceptés : PNG, JPG, WEBP, SVG, PDF, AI, EPS.',
        ];
    }
}
