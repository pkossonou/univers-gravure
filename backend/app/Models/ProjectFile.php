<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\URL;

#[Fillable(['project_id', 'upload_token', 'original_name', 'disk', 'path', 'mime_type', 'extension', 'size', 'kind', 'status', 'uploaded_by'])]
#[Hidden(['path', 'disk', 'upload_token'])]
class ProjectFile extends Model
{
    public const KINDS = ['logo', 'maquette', 'photo', 'document', 'scan', 'autre'];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** URL signée valable 30 minutes : les fichiers clients ne sont jamais publics. */
    public function temporaryUrl(bool $inline = false): string
    {
        return URL::temporarySignedRoute('files.download', now()->addMinutes(30), ['file' => $this->id] + ($inline ? ['inline' => 1] : []));
    }

    public function isImage(): bool
    {
        return in_array($this->extension, ['png', 'jpg', 'jpeg', 'webp'], true);
    }
}
