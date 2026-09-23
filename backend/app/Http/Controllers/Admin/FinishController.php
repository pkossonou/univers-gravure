<?php

namespace App\Http\Controllers\Admin;

use App\Models\Finish;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class FinishController extends CrudController
{
    protected string $model = Finish::class;

    protected string $permission = 'products';

    protected array $withCount = ['products'];

    protected array $sortable = ['name', 'created_at'];

    protected string $defaultSort = 'name';

    protected function rules(Request $request, ?Model $record): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['nullable', 'alpha_dash', 'max:100', Rule::unique('finishes')->ignore($record?->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'price_multiplier' => ['required', 'numeric', 'min:0.1', 'max:20'],
            'flat_fee' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }

    protected function prepare(array $data, ?Model $record): array
    {
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);
        $data['flat_fee'] = $data['flat_fee'] ?? 0;

        return $data;
    }
}
