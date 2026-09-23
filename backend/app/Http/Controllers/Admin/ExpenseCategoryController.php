<?php

namespace App\Http\Controllers\Admin;

use App\Models\ExpenseCategory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ExpenseCategoryController extends CrudController
{
    protected string $model = ExpenseCategory::class;

    protected string $permission = 'expenses';

    protected array $withCount = ['expenses'];

    protected array $sortable = ['name'];

    protected array $filterable = ['is_active', 'is_direct_cost'];

    protected string $defaultSort = 'name';

    protected function rules(Request $request, ?Model $record): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['nullable', 'alpha_dash', Rule::unique('expense_categories')->ignore($record?->id)],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'is_direct_cost' => ['boolean'],
            'is_recurring' => ['boolean'],
            'is_active' => ['boolean'],
        ];
    }

    protected function prepare(array $data, ?Model $record): array
    {
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);

        return $data;
    }

    public function destroy(int $id): JsonResponse
    {
        $this->allow('expenses.delete');
        if (ExpenseCategory::findOrFail($id)->expenses()->withTrashed()->exists()) {
            return $this->message('Catégorie utilisée par des dépenses : désactivez-la plutôt.', 422);
        }

        return parent::destroy($id);
    }
}
