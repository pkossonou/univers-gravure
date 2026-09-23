<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'category_id', 'reference', 'name', 'slug', 'short_description', 'description', 'base_price', 'min_price',
    'price_unit', 'is_price_visible', 'availability', 'lead_time_min_days', 'lead_time_max_days', 'dimensions',
    'size_options', 'options', 'personalization_types', 'is_configurable', 'model_3d', 'stock_quantity', 'status',
    'is_featured', 'seo_title', 'seo_description',
])]
class Product extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUSES = ['draft', 'published', 'archived'];

    public const AVAILABILITIES = ['in_stock', 'on_order', 'unavailable'];

    public const MODELS_3D = ['cup', 'star', 'column', 'plaque', 'medal', 'crystal'];

    public const PERSONALIZATIONS = ['gravure', 'impression', 'uv', 'sublimation', 'marquage', 'broderie', 'decoupe'];

    protected function casts(): array
    {
        return [
            'dimensions' => 'array',
            'size_options' => 'array',
            'options' => 'array',
            'personalization_types' => 'array',
            'is_price_visible' => 'boolean',
            'is_configurable' => 'boolean',
            'is_featured' => 'boolean',
            'base_price' => 'integer',
            'min_price' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderByDesc('is_primary')->orderBy('sort_order');
    }

    public function materials(): BelongsToMany
    {
        return $this->belongsToMany(Material::class);
    }

    public function finishes(): BelongsToMany
    {
        return $this->belongsToMany(Finish::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (! $term) {
            return $query;
        }
        $like = '%'.$term.'%';

        return $query->where(fn ($q) => $q->where('name', 'like', $like)
            ->orWhere('reference', 'like', $like)
            ->orWhere('short_description', 'like', $like)
            ->orWhereHas('tags', fn ($t) => $t->where('name', 'like', $like))
            ->orWhereHas('category', fn ($c) => $c->where('name', 'like', $like)));
    }
}
