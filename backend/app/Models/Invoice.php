<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['number', 'order_id', 'client_id', 'status', 'issued_at', 'due_at', 'subtotal', 'discount_amount', 'tax_amount', 'total', 'amount_paid', 'notes', 'created_by'])]
class Invoice extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'cancelled'];

    /** Statuts comptabilisés dans le chiffre d'affaires. */
    public const REVENUE_STATUSES = ['issued', 'partially_paid', 'paid'];

    protected function casts(): array
    {
        return ['issued_at' => 'date', 'due_at' => 'date', 'total' => 'integer', 'amount_paid' => 'integer'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function scopeCountable(Builder $query): Builder
    {
        return $query->whereIn('status', self::REVENUE_STATUSES)->whereNotNull('issued_at');
    }

    public function balance(): int
    {
        return max(0, $this->total - $this->amount_paid);
    }
}
