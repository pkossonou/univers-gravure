<?php

namespace App\Http\Requests\Admin;

use App\Models\Expense;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can($this->isMethod('post') ? 'expenses.create' : 'expenses.update');
    }

    public function rules(): array
    {
        return [
            'expense_date' => ['required', 'date', 'before_or_equal:today'],
            'expense_category_id' => ['required', 'exists:expense_categories,id'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'order_id' => ['nullable', 'exists:orders,id'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'integer', 'min:1', 'max:10000000000'],
            'payment_method' => ['required', Rule::in(Expense::PAYMENT_METHODS)],
            'reference' => ['nullable', 'string', 'max:50'],
            'receipt' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp'],
        ];
    }

    public function messages(): array
    {
        return ['expense_date.before_or_equal' => 'Une dépense ne peut pas être datée dans le futur.'];
    }
}
