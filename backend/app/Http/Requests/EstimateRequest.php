<?php

namespace App\Http\Requests;

use App\Models\Product;
use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EstimateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'project_type' => ['required_without:product_id', 'nullable', Rule::in(Project::TYPES)],
            'quantity' => ['required', 'integer', 'min:1', 'max:100000'],
            'width_mm' => ['nullable', 'integer', 'min:5', 'max:20000'],
            'height_mm' => ['nullable', 'integer', 'min:5', 'max:20000'],
            'material_id' => ['nullable', 'integer', 'exists:materials,id'],
            'finish_id' => ['nullable', 'integer', 'exists:finishes,id'],
            'size' => ['nullable', 'string', 'max:50'],
            'personalizations' => ['nullable', 'array', 'max:5'],
            'personalizations.*' => ['string', Rule::in(Product::PERSONALIZATIONS)],
            'has_logo' => ['nullable', 'boolean'],
            'urgency' => ['nullable', Rule::in(Project::URGENCIES)],
        ];
    }
}
