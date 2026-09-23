<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'slug', 'type'])]
class Tag extends Model
{
    public const TYPES = ['general', 'usage', 'event'];

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class);
    }
}
