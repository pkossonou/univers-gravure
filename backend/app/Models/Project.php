<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Demande entrante (formulaire de devis, studio, configurateur, scan…).
 */
#[Fillable([
    'number', 'client_id', 'user_id', 'channel', 'project_type', 'product_id', 'material_id', 'finish_id',
    'contact_name', 'contact_email', 'contact_phone', 'company', 'title', 'description', 'quantity',
    'width_mm', 'height_mm', 'depth_mm', 'personalization', 'configuration', 'desired_date', 'urgency',
    'estimate_min', 'estimate_max', 'estimate_confidence', 'status', 'assigned_to', 'ip_address',
])]
#[Hidden(['ip_address'])]
class Project extends Model
{
    use HasFactory, SoftDeletes;

    public const CHANNELS = ['quote_form', 'studio', 'configurator', 'photo_model', 'scan', 'calculator', 'contact', 'admin'];

    public const TYPES = ['trophee', 'medaille', 'plaque', 'gravure', 'impression', 'signaletique', 'objet', 'cadeau', 'autre'];

    public const STATUSES = ['new', 'quote_preparing', 'quote_sent', 'awaiting_validation', 'validated', 'rejected', 'cancelled'];

    public const URGENCIES = ['flexible', 'standard', 'express'];

    protected function casts(): array
    {
        return [
            'personalization' => 'array',
            'configuration' => 'array',
            'desired_date' => 'date',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }

    public function finish(): BelongsTo
    {
        return $this->belongsTo(Finish::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function files(): HasMany
    {
        return $this->hasMany(ProjectFile::class);
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    public function latestQuote(): HasOne
    {
        return $this->hasOne(Quote::class)->latestOfMany();
    }

    public function order(): HasOne
    {
        return $this->hasOne(Order::class)->latestOfMany();
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (! $term) {
            return $query;
        }
        $like = '%'.$term.'%';

        return $query->where(fn ($q) => $q->where('number', 'like', $like)
            ->orWhere('contact_name', 'like', $like)
            ->orWhere('contact_email', 'like', $like)
            ->orWhere('company', 'like', $like)
            ->orWhere('title', 'like', $like));
    }
}
