<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    use ListsRecords;

    public function index(Request $request): JsonResponse
    {
        $this->allow('products.view');
        $query = Product::query()->with(['category:id,name,slug', 'images']);

        return $this->paginated($this->listQuery($query, $request,
            ['name', 'reference', 'base_price', 'created_at', 'requests_count', 'views_count', 'stock_quantity'],
            ['status', 'category_id', 'availability', 'is_featured', 'is_configurable'],
        ), ProductResource::class);
    }

    public function show(Product $product): JsonResponse
    {
        $this->allow('products.view');

        return response()->json(['data' => new ProductResource($product->load(['category', 'images', 'materials', 'finishes', 'tags', 'variants']))]);
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $product = DB::transaction(fn () => $this->persist(new Product, $request->validated()));
        ActivityLogger::log('product.created', $product);

        return response()->json(['data' => new ProductResource($product)], 201);
    }

    public function update(ProductRequest $request, Product $product): JsonResponse
    {
        $product = DB::transaction(fn () => $this->persist($product, $request->validated()));
        ActivityLogger::log('product.updated', $product);

        return response()->json(['data' => new ProductResource($product)]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->allow('products.delete');
        $product->update(['status' => 'archived']);
        $product->delete();
        $this->flushCatalogCache();
        ActivityLogger::log('product.archived', $product);

        return $this->message('Produit archivé.');
    }

    public function uploadImage(Request $request, Product $product): JsonResponse
    {
        $this->allow('products.update');
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192', 'dimensions:min_width=400,min_height=400'],
            'alt' => ['required', 'string', 'max:190'],
            'is_primary' => ['boolean'],
        ]);

        $path = $request->file('image')->store('products/'.$product->id, 'public');
        if ($request->boolean('is_primary')) {
            $product->images()->update(['is_primary' => false]);
        }
        $image = $product->images()->create([
            'path' => $path,
            'alt' => $request->alt,
            'is_primary' => $request->boolean('is_primary') || ! $product->images()->exists(),
            'sort_order' => (int) $product->images()->max('sort_order') + 1,
        ]);

        return response()->json(['data' => $image], 201);
    }

    public function deleteImage(Product $product, ProductImage $image): JsonResponse
    {
        $this->allow('products.update');
        abort_unless($image->product_id === $product->id, 404);
        if ($image->path) {
            Storage::disk('public')->delete($image->path);
        }
        $image->delete();

        return $this->message('Image supprimée.');
    }

    private function persist(Product $product, array $data): Product
    {
        $relations = [
            'materials' => $data['material_ids'] ?? null,
            'finishes' => $data['finish_ids'] ?? null,
            'tags' => $data['tag_ids'] ?? null,
        ];
        unset($data['material_ids'], $data['finish_ids'], $data['tag_ids']);

        $product->fill($data)->save();
        foreach ($relations as $relation => $ids) {
            if ($ids !== null) {
                $product->{$relation}()->sync($ids);
            }
        }
        $this->flushCatalogCache();

        return $product->load(['category', 'images', 'materials', 'finishes', 'tags']);
    }

    private function flushCatalogCache(): void
    {
        Cache::forget('catalog.categories');
        Cache::forget('catalog.filters');
    }
}
