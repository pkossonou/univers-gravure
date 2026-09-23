<?php

namespace App\Http\Controllers\Admin;

use App\Models\Expense;
use App\Models\Revenue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Recettes hors facture (vente comptoir, prestation ponctuelle). */
class RevenueController extends CrudController
{
    protected string $model = Revenue::class;

    protected string $permission = 'revenues';

    protected array $with = ['client:id,company,first_name,last_name', 'category:id,name', 'recorder:id,name'];

    protected array $sortable = ['revenue_date', 'amount', 'created_at'];

    protected array $filterable = ['source', 'client_id', 'category_id', 'payment_method'];

    protected array $searchable = ['description', 'reference'];

    protected string $defaultSort = '-revenue_date';

    protected ?string $dateColumn = 'revenue_date';

    protected function rules(Request $request, ?Model $record): array
    {
        return [
            'revenue_date' => ['required', 'date', 'before_or_equal:today'],
            'client_id' => ['nullable', 'exists:clients,id'],
            'order_id' => ['nullable', 'exists:orders,id'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'source' => ['required', Rule::in(Revenue::SOURCES)],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'integer', 'min:1'],
            'payment_method' => ['required', Rule::in(Expense::PAYMENT_METHODS)],
            'reference' => ['nullable', 'string', 'max:50'],
        ];
    }

    protected function prepare(array $data, ?Model $record): array
    {
        if (! $record) {
            $data['recorded_by'] = auth()->id();
        }

        return $data;
    }
}
