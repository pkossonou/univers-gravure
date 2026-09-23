<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable(['stock_item_id', 'type', 'quantity', 'quantity_before', 'quantity_after', 'unit_cost', 'reason', 'reference_type', 'reference_id', 'user_id', 'moved_at'])]
class StockMovement extends Model
{
    public const TYPES = ['in', 'out', 'adjustment'];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'quantity_before' => 'float',
            'quantity_after' => 'float',
            'moved_at' => 'datetime',
        ];
    }

    public function stockItem(): BelongsTo
    {
        return $this->belongsTo(StockItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
