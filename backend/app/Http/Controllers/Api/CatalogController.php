<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Finish;
use App\Models\Material;
use App\Models\PortfolioItem;
use App\Models\Product;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CatalogController extends Controller
{
    public function categories(): JsonResponse
    {
        $categories = Cache::remember('catalog.categories', 300, fn () => Category::query()
            ->where('is_active', true)
            ->withCount(['products' => fn ($q) => $q->published()])
            ->orderBy('sort_order')
            ->get(['id', 'parent_id', 'name', 'slug', 'tagline', 'description', 'icon', 'image_url', 'show_in_services', 'seo_title', 'seo_description'])
            ->toArray()); // tableaux simples : le cache n'accepte pas d'objets sérialisés

        return response()->json(['data' => $categories]);
    }

    public function category(string $slug): JsonResponse
    {
        $category = Category::query()->where('is_active', true)->where('slug', $slug)->firstOrFail();

        return response()->json(['data' => $category]);
    }

    /**
     * Filtres : category, material, finish, personalization, usage, event (slugs, séparés par virgule),
     * price_min, price_max, height_min, height_max, availability, featured, configurable, search, sort.
     */
    public function products(Request $request): JsonResponse
    {
        $request->validate([
            'price_min' => ['nullable', 'integer', 'min:0'],
            'price_max' => ['nullable', 'integer', 'min:0'],
            'height_min' => ['nullable', 'integer', 'min:0'],
            'height_max' => ['nullable', 'integer', 'min:0'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:60'],
            'sort' => ['nullable', 'in:popular,newest,price_asc,price_desc,name'],
        ]);

        $query = Product::query()->published()
            ->with(['category:id,name,slug', 'images', 'materials:id,name,slug,color_hex', 'tags:id,name,slug,type'])
            ->search($request->query('search'));

        $slugs = fn (string $key) => array_filter(explode(',', (string) $request->query($key)));

        if ($s = $slugs('category')) {
            $query->whereHas('category', fn (Builder $q) => $q->whereIn('slug', $s));
        }
        if ($s = $slugs('material')) {
            $query->whereHas('materials', fn (Builder $q) => $q->whereIn('slug', $s));
        }
        if ($s = $slugs('finish')) {
            $query->whereHas('finishes', fn (Builder $q) => $q->whereIn('slug', $s));
        }
        foreach (['usage', 'event'] as $type) {
            if ($s = $slugs($type)) {
                $query->whereHas('tags', fn (Builder $q) => $q->where('type', $type)->whereIn('slug', $s));
            }
        }
        if ($s = $slugs('personalization')) {
            $query->where(function (Builder $q) use ($s) {
                foreach ($s as $mode) {
                    $q->orWhereJsonContains('personalization_types', $mode);
                }
            });
        }
        if ($request->filled('price_min')) {
            $query->where('base_price', '>=', (int) $request->price_min)->where('is_price_visible', true);
        }
        if ($request->filled('price_max')) {
            $query->where('base_price', '<=', (int) $request->price_max)->where('is_price_visible', true);
        }
        if ($request->filled('height_min')) {
            $query->where('dimensions->height', '>=', (int) $request->height_min);
        }
        if ($request->filled('height_max')) {
            $query->where('dimensions->height', '<=', (int) $request->height_max);
        }
        if ($a = $slugs('availability')) {
            $query->whereIn('availability', $a);
        }
        if ($ids = $slugs('id')) {
            $query->whereKey(array_map('intval', $ids));
        }
        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }
        if ($request->boolean('configurable')) {
            $query->where('is_configurable', true);
        }

        match ($request->query('sort', 'popular')) {
            'newest' => $query->latest(),
            'price_asc' => $query->orderByRaw('base_price IS NULL')->orderBy('base_price'),
            'price_desc' => $query->orderByDesc('base_price'),
            'name' => $query->orderBy('name'),
            default => $query->orderByDesc('is_featured')->orderByDesc('requests_count')->orderByDesc('views_count'),
        };

        $paginator = $query->paginate((int) $request->query('per_page', 24))->withQueryString();

        return $this->paginated($paginator, ProductResource::class);
    }

    public function product(string $slug): JsonResponse
    {
        $product = Product::query()->published()
            ->with(['category', 'images', 'materials', 'finishes', 'tags', 'variants' => fn ($q) => $q->where('is_active', true)])
            ->where('slug', $slug)
            ->firstOrFail();

        Product::whereKey($product->id)->increment('views_count');

        $related = Product::query()->published()
            ->with(['category:id,name,slug', 'images'])
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->id)
            ->orderByDesc('is_featured')
            ->limit(4)
            ->get();

        return response()->json([
            'data' => new ProductResource($product),
            'related' => ProductResource::collection($related),
        ]);
    }

    public function materials(): JsonResponse
    {
        return response()->json(['data' => Material::query()->where('is_active', true)->orderBy('name')
            ->get(['id', 'name', 'slug', 'description', 'color_hex', 'price_per_m2'])]);
    }

    public function finishes(): JsonResponse
    {
        return response()->json(['data' => Finish::query()->where('is_active', true)->orderBy('name')
            ->get(['id', 'name', 'slug', 'description'])]);
    }

    /** Facettes pour les filtres du catalogue (avec compteurs réels). */
    public function filters(): JsonResponse
    {
        $data = Cache::remember('catalog.filters', 300, function () {
            $published = fn ($q) => $q->published();
            $prices = Product::query()->published()->where('is_price_visible', true)->whereNotNull('base_price')
                ->selectRaw('MIN(base_price) as min, MAX(base_price) as max')->first();

            $facets = [
                'categories' => Category::query()->where('is_active', true)->withCount(['products' => $published])
                    ->orderBy('sort_order')->get(['id', 'name', 'slug']),
                'materials' => Material::query()->where('is_active', true)->withCount(['products' => $published])
                    ->orderBy('name')->get(['id', 'name', 'slug', 'color_hex']),
                'usages' => Tag::query()->where('type', 'usage')->withCount(['products' => $published])->orderBy('name')->get(['id', 'name', 'slug']),
                'events' => Tag::query()->where('type', 'event')->withCount(['products' => $published])->orderBy('name')->get(['id', 'name', 'slug']),
                'personalizations' => collect(Product::PERSONALIZATIONS)->map(fn ($p) => [
                    'slug' => $p,
                    'name' => ucfirst($p === 'uv' ? 'Impression UV' : $p),
                    'products_count' => Product::query()->published()->whereJsonContains('personalization_types', $p)->count(),
                ])->filter(fn ($p) => $p['products_count'] > 0)->values(),
                'price' => ['min' => (int) ($prices->min ?? 0), 'max' => (int) ($prices->max ?? 0)],
            ];

            // Tableaux simples uniquement (cache.serializable_classes = false)
            return json_decode(json_encode($facets), true);
        });

        return response()->json(['data' => $data]);
    }

    public function portfolio(Request $request): JsonResponse
    {
        $query = PortfolioItem::query()->where('is_published', true)->orderBy('sort_order')->orderByDesc('year');
        if ($cat = $request->query('category')) {
            $query->where('category', $cat);
        }

        return response()->json(['data' => $query->get(), 'categories' => PortfolioItem::CATEGORIES]);
    }
}
