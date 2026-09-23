<?php

namespace App\Http\Requests\Admin;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can($this->isMethod('post') ? 'products.create' : 'products.update');
    }

    protected function prepareForValidation(): void
    {
        if (! $this->slug && $this->name) {
            $this->merge(['slug' => Str::slug($this->name)]);
        }
    }

    public function rules(): array
    {
        $id = $this->route('product')?->id;

        return [
            'category_id' => ['required', 'exists:categories,id'],
            'reference' => ['required', 'string', 'max:40', Rule::unique('products')->ignore($id)],
            'name' => ['required', 'string', 'max:190'],
            'slug' => ['required', 'alpha_dash', 'max:190', Rule::unique('products')->ignore($id)],
            'short_description' => ['nullable', 'string', 'max:320'],
            'description' => ['nullable', 'string', 'max:10000'],
            'base_price' => ['nullable', 'integer', 'min:0'],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'price_unit' => ['required', Rule::in(['unit', 'area'])],
            'is_price_visible' => ['boolean'],
            'availability' => ['required', Rule::in(Product::AVAILABILITIES)],
            'lead_time_min_days' => ['required', 'integer', 'min:0', 'max:365'],
            'lead_time_max_days' => ['required', 'integer', 'gte:lead_time_min_days', 'max:365'],
            'dimensions' => ['nullable', 'array'],
            'dimensions.width' => ['nullable', 'integer', 'min:1'],
            'dimensions.height' => ['nullable', 'integer', 'min:1'],
            'dimensions.depth' => ['nullable', 'integer', 'min:1'],
            'size_options' => ['nullable', 'array'],
            'size_options.*.label' => ['required', 'string', 'max:50'],
            'size_options.*.height_mm' => ['nullable', 'integer', 'min:1'],
            'size_options.*.multiplier' => ['required', 'numeric', 'min:0.1', 'max:20'],
            'options' => ['nullable', 'array'],
            'personalization_types' => ['nullable', 'array'],
            'personalization_types.*' => [Rule::in(Product::PERSONALIZATIONS)],
            'is_configurable' => ['boolean'],
            'model_3d' => ['nullable', Rule::in(Product::MODELS_3D)],
            'stock_quantity' => ['nullable', 'integer'],
            'status' => ['required', Rule::in(Product::STATUSES)],
            'is_featured' => ['boolean'],
            'seo_title' => ['nullable', 'string', 'max:190'],
            'seo_description' => ['nullable', 'string', 'max:320'],
            'material_ids' => ['nullable', 'array'],
            'material_ids.*' => ['exists:materials,id'],
            'finish_ids' => ['nullable', 'array'],
            'finish_ids.*' => ['exists:finishes,id'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['exists:tags,id'],
        ];
    }
}
