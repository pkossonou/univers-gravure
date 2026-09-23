<?php

namespace App\Http\Controllers\Admin;

use App\Models\Tag;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TagController extends CrudController
{
    protected string $model = Tag::class;

    protected string $permission = 'products';

    protected array $withCount = ['products'];

    protected array $sortable = ['name', 'type'];

    protected array $filterable = ['type'];

    protected string $defaultSort = 'name';

    protected function rules(Request $request, ?Model $record): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
            'type' => ['required', Rule::in(Tag::TYPES)],
        ];
    }

    protected function prepare(array $data, ?Model $record): array
    {
        return $data + ['slug' => Str::slug($data['name'])];
    }
}
