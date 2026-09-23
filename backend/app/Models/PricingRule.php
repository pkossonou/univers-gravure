<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Règle tarifaire configurable depuis le back-office.
 *
 * Types :
 *  - category_base   : prix de départ d'un type de projet sans produit (conditions.project_type)
 *  - quantity_tier   : remise selon quantité (conditions.min_qty / max_qty)
 *  - urgency         : majoration selon délai (conditions.urgency)
 *  - personalization : coût par unité d'un mode (conditions.personalization)
 *  - setup           : frais fixes (conditions.when = logo | always)
 */
#[Fillable(['name', 'type', 'category_id', 'conditions', 'amount', 'amount_type', 'priority', 'is_active'])]
class PricingRule extends Model
{
    public const TYPES = ['category_base', 'quantity_tier', 'urgency', 'personalization', 'setup'];

    public const AMOUNT_TYPES = ['percent', 'fixed', 'per_unit'];

    protected function casts(): array
    {
        return ['conditions' => 'array', 'amount' => 'float', 'is_active' => 'boolean'];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function condition(string $key, mixed $default = null): mixed
    {
        return $this->conditions[$key] ?? $default;
    }
}
