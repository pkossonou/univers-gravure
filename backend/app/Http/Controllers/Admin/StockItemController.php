<?php

namespace App\Http\Controllers\Admin;

use App\Models\StockItem;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockItemController extends CrudController
{
    protected string $model = StockItem::class;

    protected string $permission = 'stock';

    protected array $with = ['supplier:id,name', 'material:id,name'];

    protected array $sortable = ['name', 'sku', 'quantity', 'unit_cost', 'created_at'];

    protected array $filterable = ['type', 'supplier_id', 'is_active'];

    protected array $searchable = ['name', 'sku', 'location'];

    protected string $defaultSort = 'name';

    protected function rules(Request $request, ?Model $record): array
    {
        return [
            'name' => ['required', 'string', 'max:190'],
            'sku' => ['required', 'string', 'max:50', Rule::unique('stock_items')->ignore($record?->id)],
            'type' => ['required', Rule::in(StockItem::TYPES)],
            'unit' => ['required', Rule::in(StockItem::UNITS)],
            // La quantité initiale n'est saisissable qu'à la création ; ensuite, uniquement par mouvements
            'quantity' => [$record ? 'prohibited' : 'nullable', 'numeric', 'min:0'],
            'alert_threshold' => ['nullable', 'numeric', 'min:0'],
            'unit_cost' => ['nullable', 'integer', 'min:0'],
            'location' => ['nullable', 'string', 'max:100'],
            'material_id' => ['nullable', 'exists:materials,id'],
            'product_id' => ['nullable', 'exists:products,id'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'is_active' => ['boolean'],
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $this->allow('stock.view');
        $query = StockItem::query()->with($this->with);
        if ($request->boolean('low')) {
            $query->low();
        }
        $paginator = $this->listQuery($query, $request, $this->sortable, $this->filterable, $this->searchable, $this->defaultSort);

        return $this->paginated($paginator, null, [
            'low_count' => StockItem::query()->low()->count(),
            'stock_value' => (int) StockItem::query()->selectRaw('SUM(quantity * unit_cost) as v')->value('v'),
        ]);
    }

    protected function afterSave(Model $record, array $data, Request $request): void
    {
        // Quantité initiale tracée comme un mouvement d'entrée
        if ($record->wasRecentlyCreated && ($data['quantity'] ?? 0) > 0) {
            $record->update(['quantity' => 0]);
            app(StockService::class)->move($record, 'in', (float) $data['quantity'], 'Stock initial');
        }
    }

    public function movements(Request $request, int $id): JsonResponse
    {
        $this->allow('stock.view');
        $item = StockItem::findOrFail($id);

        return $this->paginated($item->movements()->with('user:id,name')->paginate(30));
    }

    public function move(Request $request, int $id, StockService $stock): JsonResponse
    {
        $this->allow('stock.update');
        $data = $request->validate([
            'type' => ['required', Rule::in(StockMovement::TYPES)],
            'quantity' => ['required', 'numeric', 'min:0', 'max:1000000'],
            'reason' => ['required', 'string', 'max:255'],
            'unit_cost' => ['nullable', 'integer', 'min:0'],
        ]);

        $movement = $stock->move(StockItem::findOrFail($id), $data['type'], (float) $data['quantity'], $data['reason'], null, $data['unit_cost'] ?? null);

        return response()->json(['data' => $movement->load('stockItem')], 201);
    }
}
