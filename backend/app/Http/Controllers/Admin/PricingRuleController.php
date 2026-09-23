<?php

namespace App\Http\Controllers\Admin;

use App\Models\PricingRule;
use App\Models\Product;
use App\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Règles tarifaires du calculateur (§13 : configurable depuis le back-office). */
class PricingRuleController extends CrudController
{
    protected string $model = PricingRule::class;

    protected string $permission = 'pricing';

    protected array $with = ['category:id,name'];

    protected array $sortable = ['name', 'type', 'priority'];

    protected array $filterable = ['type', 'is_active'];

    protected string $defaultSort = 'type';

    protected function rules(Request $request, ?Model $record): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'type' => ['required', Rule::in(PricingRule::TYPES)],
            'category_id' => ['nullable', 'exists:categories,id'],
            'conditions' => ['nullable', 'array'],
            'conditions.min_qty' => ['nullable', 'integer', 'min:1'],
            'conditions.max_qty' => ['nullable', 'integer', 'min:1'],
            'conditions.urgency' => ['nullable', Rule::in(Project::URGENCIES)],
            'conditions.personalization' => ['nullable', Rule::in(Product::PERSONALIZATIONS)],
            'conditions.project_type' => ['nullable', Rule::in(Project::TYPES)],
            'conditions.when' => ['nullable', Rule::in(['always', 'logo'])],
            'conditions.per' => ['nullable', Rule::in(['unit', 'm2'])],
            'amount' => ['required', 'numeric', 'min:-100', 'max:100000000'],
            'amount_type' => ['required', Rule::in(PricingRule::AMOUNT_TYPES)],
            'priority' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'is_active' => ['boolean'],
        ];
    }

    /** Les règles tarifaires relèvent d'une seule permission : pricing.manage. */
    protected function allow(string $permission): void
    {
        parent::allow('pricing.manage');
    }
}
