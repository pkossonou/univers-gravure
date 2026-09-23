<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['number', 'order_id', 'order_item_id', 'assigned_to', 'status', 'priority', 'started_at', 'due_at', 'finished_at', 'notes'])]
class ProductionOrder extends Model
{
    public const STATUSES = ['pending', 'in_progress', 'paused', 'done', 'cancelled'];

    public const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

    /** Étapes créées par défaut pour chaque ordre de production. */
    public const DEFAULT_STEPS = [
        ['code' => 'design', 'name' => 'Conception / BAT', 'is_client_visible' => true],
        ['code' => 'preparation', 'name' => 'Préparation matière', 'is_client_visible' => false],
        ['code' => 'fabrication', 'name' => 'Gravure / impression', 'is_client_visible' => true],
        ['code' => 'assembly', 'name' => 'Assemblage & finitions', 'is_client_visible' => false],
        ['code' => 'quality', 'name' => 'Contrôle qualité', 'is_client_visible' => true],
        ['code' => 'packaging', 'name' => 'Conditionnement', 'is_client_visible' => false],
    ];

    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'finished_at' => 'datetime', 'due_at' => 'date'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(ProductionStep::class)->orderBy('sort_order');
    }

    public function progress(): int
    {
        $steps = $this->relationLoaded('steps') ? $this->steps : $this->steps()->get();
        $relevant = $steps->where('status', '!=', 'skipped');
        if ($relevant->isEmpty()) {
            return 0;
        }

        return (int) round($relevant->where('status', 'done')->count() / $relevant->count() * 100);
    }
}
