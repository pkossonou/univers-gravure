<?php

namespace App\Http\Controllers\Admin;

use App\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends CrudController
{
    protected string $model = Supplier::class;

    protected string $permission = 'suppliers';

    protected array $with = ['contacts', 'products'];

    protected array $withCount = ['purchases'];

    protected array $sortable = ['name', 'city', 'created_at'];

    protected array $filterable = ['category', 'is_active', 'city'];

    protected array $searchable = ['name', 'email', 'phone', 'category'];

    protected string $defaultSort = 'name';

    protected function rules(Request $request, ?Model $record): array
    {
        return [
            'name' => ['required', 'string', 'max:190'],
            'email' => ['nullable', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:50'],
            'tax_number' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'is_active' => ['boolean'],
            'contacts' => ['nullable', 'array', 'max:20'],
            'contacts.*.name' => ['required', 'string', 'max:120'],
            'contacts.*.role' => ['nullable', 'string', 'max:100'],
            'contacts.*.email' => ['nullable', 'email', 'max:190'],
            'contacts.*.phone' => ['nullable', 'string', 'max:30'],
            'products' => ['nullable', 'array', 'max:200'],
            'products.*.name' => ['required', 'string', 'max:190'],
            'products.*.reference' => ['nullable', 'string', 'max:50'],
            'products.*.stock_item_id' => ['nullable', 'exists:stock_items,id'],
            'products.*.unit_price' => ['required', 'integer', 'min:0'],
            'products.*.unit' => ['nullable', 'string', 'max:12'],
            'products.*.lead_time_days' => ['nullable', 'integer', 'min:0'],
        ];
    }

    protected function prepare(array $data, ?Model $record): array
    {
        unset($data['contacts'], $data['products']);

        return $data;
    }

    protected function afterSave(Model $record, array $data, Request $request): void
    {
        if (array_key_exists('contacts', $data)) {
            $record->contacts()->delete();
            $record->contacts()->createMany($data['contacts'] ?? []);
        }
        if (array_key_exists('products', $data)) {
            $record->products()->delete();
            $record->products()->createMany($data['products'] ?? []);
        }
    }

    /** Fiche fournisseur complète : achats et dépenses associées. */
    public function show(int $id): JsonResponse
    {
        $this->allow('suppliers.view');
        $supplier = Supplier::with(['contacts', 'products.stockItem:id,name,sku', 'purchases' => fn ($q) => $q->latest('purchase_date')->limit(20)])
            ->findOrFail($id);

        return response()->json(['data' => $supplier, 'stats' => [
            'purchases_total' => (int) $supplier->purchases()->where('status', 'received')->sum('total'),
            'expenses_total' => (int) $supplier->expenses()->sum('amount'),
            'expenses' => $supplier->expenses()->with('category:id,name')->latest('expense_date')->limit(20)->get(),
        ]]);
    }
}
