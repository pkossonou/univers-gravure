<?php

namespace App\Http\Controllers\Admin;

use App\Models\Category;
use App\Services\MediaService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends CrudController
{
    protected string $model = Category::class;

    protected string $permission = 'products';

    protected array $with = ['parent:id,name'];

    protected array $withCount = ['products'];

    protected array $sortable = ['name', 'sort_order', 'created_at'];

    protected array $filterable = ['is_active', 'parent_id', 'show_in_services'];

    protected string $defaultSort = 'sort_order';

    protected function rules(Request $request, ?Model $record): array
    {
        return [
            'parent_id' => ['nullable', 'exists:categories,id', Rule::notIn([$record?->id])],
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['nullable', 'alpha_dash', 'max:100', Rule::unique('categories')->ignore($record?->id)],
            'tagline' => ['nullable', 'string', 'max:190'],
            'description' => ['nullable', 'string', 'max:2000'],
            'icon' => ['nullable', 'string', 'max:50'],
            'image' => MediaService::IMAGE_RULES,
            'image_url' => ['nullable', 'string', 'max:255', 'regex:#^(https?://|/)#'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            'show_in_services' => ['boolean'],
            'seo_title' => ['nullable', 'string', 'max:190'],
            'seo_description' => ['nullable', 'string', 'max:320'],
        ];
    }

    protected function prepare(array $data, ?Model $record): array
    {
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);
        unset($data['image']);
        if (request()->hasFile('image')) {
            $media = app(MediaService::class);
            $media->delete($record?->image_url);
            $data['image_url'] = $media->store(request()->file('image'), 'categories');
        }
        Cache::forget('catalog.categories');
        Cache::forget('catalog.filters');

        return $data;
    }

    public function destroy(int $id): JsonResponse
    {
        $this->allow('products.delete');
        $category = Category::withCount('products')->findOrFail($id);
        if ($category->products_count > 0) {
            return $this->message('Cette catégorie contient des produits : déplacez-les ou désactivez la catégorie.', 422);
        }
        Cache::forget('catalog.categories');

        return parent::destroy($id);
    }
}
