<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['number', 'supplier_id', 'purchase_date', 'status', 'total', 'notes', 'received_at', 'created_by'])]
class Purchase extends Model
{
    public const STATUSES = ['ordered', 'received', 'cancelled'];

    protected function casts(): array
    {
        return ['purchase_date' => 'date', 'received_at' => 'datetime'];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function expense(): HasOne
    {
        return $this->hasOne(Expense::class);
    }
}
