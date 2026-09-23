<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['production_order_id', 'name', 'code', 'sort_order', 'status', 'assigned_to', 'is_client_visible', 'started_at', 'completed_at', 'notes'])]
class ProductionStep extends Model
{
    public const STATUSES = ['pending', 'in_progress', 'done', 'skipped'];

    protected function casts(): array
    {
        return ['is_client_visible' => 'boolean', 'started_at' => 'datetime', 'completed_at' => 'datetime'];
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
