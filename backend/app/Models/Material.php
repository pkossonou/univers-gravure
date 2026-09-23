<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'slug', 'description', 'color_hex', 'price_multiplier', 'price_per_m2', 'is_active'])]
class Material extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return ['price_multiplier' => 'float', 'price_per_m2' => 'integer', 'is_active' => 'boolean'];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class);
    }
}
