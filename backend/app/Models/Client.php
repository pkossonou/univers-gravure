<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['user_id', 'type', 'first_name', 'last_name', 'company', 'email', 'phone', 'address', 'city', 'country', 'source', 'notes', 'created_by'])]
#[Appends(['display_name'])]
class Client extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPES = ['particulier', 'entreprise', 'association', 'administration', 'etablissement_scolaire'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function revenues(): HasMany
    {
        return $this->hasMany(Revenue::class);
    }

    protected function displayName(): Attribute
    {
        return Attribute::get(fn () => $this->company
            ?: (trim(($this->first_name ?? '').' '.($this->last_name ?? '')) ?: ($this->email ?? '—')));
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (! $term) {
            return $query;
        }
        $like = '%'.$term.'%';

        return $query->where(fn ($q) => $q->where('first_name', 'like', $like)
            ->orWhere('last_name', 'like', $like)
            ->orWhere('company', 'like', $like)
            ->orWhere('email', 'like', $like)
            ->orWhere('phone', 'like', $like));
    }
}
