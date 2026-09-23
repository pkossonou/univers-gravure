<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Médias publics du site (réalisations, catégories, photos de trophées).
 * Stockés sur le disque « public » sous un nom aléatoire ; l'URL complète est enregistrée en base.
 * Les fichiers clients privés, eux, passent par FileUploadService (disque privé + URL signée).
 */
class MediaService
{
    public const IMAGE_RULES = ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'];

    public const VIDEO_RULES = ['nullable', 'file', 'mimetypes:video/mp4,video/webm,video/quicktime', 'max:61440'];

    public function store(UploadedFile $file, string $folder): string
    {
        $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension());
        $path = $file->storeAs($folder, Str::random(32).'.'.$extension, 'public');

        return Storage::disk('public')->url($path);
    }

    /** Copie un fichier local (import d'un dossier) vers le disque public. */
    public function storeLocal(string $sourcePath, string $folder): string
    {
        $extension = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
        $path = $folder.'/'.Str::random(32).'.'.$extension;
        Storage::disk('public')->put($path, file_get_contents($sourcePath));

        return Storage::disk('public')->url($path);
    }

    /** Supprime un média public si l'URL pointe vers notre stockage (les URL externes sont ignorées). */
    public function delete(?string $url): void
    {
        if (! $url) {
            return;
        }
        $prefix = rtrim(Storage::disk('public')->url(''), '/').'/';
        if (str_starts_with($url, $prefix)) {
            Storage::disk('public')->delete(substr($url, strlen($prefix)));
        }
    }
}
