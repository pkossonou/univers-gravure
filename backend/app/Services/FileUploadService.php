<?php

namespace App\Services;

use App\Models\ProjectFile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Stockage sécurisé des fichiers clients (ARCHITECTURE D7) :
 * disque privé, nom aléatoire, extension ET type MIME réel contrôlés.
 */
class FileUploadService
{
    /** extension => types MIME réels acceptés */
    public const ALLOWED = [
        'png' => ['image/png'],
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'webp' => ['image/webp'],
        'svg' => ['image/svg+xml', 'text/xml', 'application/xml', 'text/plain'],
        'pdf' => ['application/pdf'],
        'ai' => ['application/pdf', 'application/postscript', 'application/illustrator'],
        'eps' => ['application/postscript', 'image/x-eps', 'application/eps'],
    ];

    public function store(UploadedFile $file, string $kind = 'autre', ?int $userId = null): ProjectFile
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $mime = (string) $file->getMimeType(); // détecté depuis le contenu, pas depuis le navigateur

        if (! isset(self::ALLOWED[$extension]) || ! in_array($mime, self::ALLOWED[$extension], true)) {
            throw ValidationException::withMessages(['file' => 'Type de fichier non autorisé.']);
        }

        if ($extension === 'svg' && $this->svgIsDangerous((string) file_get_contents($file->getRealPath()))) {
            throw ValidationException::withMessages(['file' => 'Ce fichier SVG contient des éléments non autorisés (scripts).']);
        }

        $path = $file->storeAs('projects/'.now()->format('Y/m'), Str::random(40).'.'.$extension, 'local');

        return ProjectFile::create([
            'upload_token' => Str::random(48),
            'original_name' => Str::limit(preg_replace('/[^\pL\pN._\- ]/u', '_', $file->getClientOriginalName()), 180, ''),
            'disk' => 'local',
            'path' => $path,
            'mime_type' => $mime,
            'extension' => $extension,
            'size' => $file->getSize(),
            'kind' => in_array($kind, ProjectFile::KINDS, true) ? $kind : 'autre',
            'status' => 'pending',
            'uploaded_by' => $userId,
        ]);
    }

    private function svgIsDangerous(string $content): bool
    {
        return (bool) preg_match('/<script|on\w+\s*=|javascript:|<foreignObject|<iframe|<embed/i', $content);
    }
}
