<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $internal = $request->is('api/v1/admin/*');
        $priceVisible = $this->is_price_visible || $internal;

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'name' => $this->name,
            'slug' => $this->slug,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id, 'name' => $this->category->name, 'slug' => $this->category->slug,
            ]),
            'short_description' => $this->short_description,
            'description' => $this->when($request->routeIs('*.show') || $internal, $this->description),
            'price' => [
                'base' => $priceVisible ? $this->base_price : null,
                'from' => $priceVisible ? ($this->min_price ?: $this->base_price) : null,
                'unit' => $this->price_unit,
                'on_quote' => ! $this->base_price || ! $this->is_price_visible,
            ],
            'availability' => $this->availability,
            'lead_time' => ['min' => $this->lead_time_min_days, 'max' => $this->lead_time_max_days],
            'dimensions' => $this->dimensions,
            'size_options' => $this->size_options,
            'options' => $this->options,
            'personalization_types' => $this->personalization_types ?? [],
            'is_configurable' => $this->is_configurable,
            'model_3d' => $this->model_3d,
            'is_featured' => $this->is_featured,
            'images' => $this->whenLoaded('images', fn () => $this->images->map(fn ($i) => [
                'id' => $i->id, 'src' => $i->src, 'alt' => $i->alt, 'is_primary' => $i->is_primary,
            ])),
            'materials' => $this->whenLoaded('materials', fn () => $this->materials->map->only(['id', 'name', 'slug', 'color_hex'])),
            'finishes' => $this->whenLoaded('finishes', fn () => $this->finishes->map->only(['id', 'name', 'slug'])),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->map->only(['id', 'name', 'slug', 'type'])),
            'variants' => $this->whenLoaded('variants'),
            'seo' => ['title' => $this->seo_title ?: $this->name, 'description' => $this->seo_description ?: $this->short_description],
            $this->mergeWhen($internal, fn () => [
                'status' => $this->status,
                'base_price' => $this->base_price,
                'min_price' => $this->min_price,
                'is_price_visible' => $this->is_price_visible,
                'stock_quantity' => $this->stock_quantity,
                'requests_count' => $this->requests_count,
                'views_count' => $this->views_count,
                'category_id' => $this->category_id,
                'seo_title' => $this->seo_title,
                'seo_description' => $this->seo_description,
                'lead_time_min_days' => $this->lead_time_min_days,
                'lead_time_max_days' => $this->lead_time_max_days,
                'created_at' => $this->created_at,
                'updated_at' => $this->updated_at,
            ]),
        ];
    }
}
