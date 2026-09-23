<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'slug', 'description', 'price_multiplier', 'flat_fee', 'is_active'])]
class Finish extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return ['price_multiplier' => 'float', 'flat_fee' => 'integer', 'is_active' => 'boolean'];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class);
    }
}
