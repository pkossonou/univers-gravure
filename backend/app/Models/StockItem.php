<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'sku', 'type', 'unit', 'quantity', 'alert_threshold', 'unit_cost', 'location', 'material_id', 'product_id', 'supplier_id', 'is_active'])]
#[Appends(['is_low'])]
class StockItem extends Model
{
    public const TYPES = ['raw_material', 'consumable', 'product'];

    public const UNITS = ['pcs', 'm', 'm2', 'kg', 'feuille', 'litre', 'rouleau'];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'alert_threshold' => 'float',
            'unit_cost' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class)->latest('moved_at');
    }

    protected function isLow(): Attribute
    {
        return Attribute::get(fn () => $this->alert_threshold > 0 && $this->quantity <= $this->alert_threshold);
    }

    public function scopeLow(Builder $query): Builder
    {
        return $query->where('alert_threshold', '>', 0)->whereColumn('quantity', '<=', 'alert_threshold');
    }
}
