<?php

namespace App\Http\Controllers\Admin;

use App\Models\Material;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MaterialController extends CrudController
{
    protected string $model = Material::class;

    protected string $permission = 'products';

    protected array $withCount = ['products'];

    protected array $sortable = ['name', 'price_multiplier', 'created_at'];

    protected array $filterable = ['is_active'];

    protected string $defaultSort = 'name';

    protected function rules(Request $request, ?Model $record): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['nullable', 'alpha_dash', 'max:100', Rule::unique('materials')->ignore($record?->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'color_hex' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'price_multiplier' => ['required', 'numeric', 'min:0.1', 'max:20'],
            'price_per_m2' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }

    protected function prepare(array $data, ?Model $record): array
    {
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);

        return $data;
    }
}
