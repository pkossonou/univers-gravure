<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use App\Models\Purchase;
use App\Services\ActivityLogger;
use App\Services\NumberingService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Achats fournisseurs : commande → réception (entrées en stock + dépense). */
class PurchaseController extends Controller
{
    use ListsRecords;

    protected ?string $dateColumn = 'purchase_date';

    public function index(Request $request): JsonResponse
    {
        $this->allow('suppliers.view');

        return $this->paginated($this->listQuery(
            Purchase::query()->with(['supplier:id,name'])->withCount('items'),
            $request, ['purchase_date', 'total', 'created_at'], ['status', 'supplier_id'], ['number'], '-purchase_date',
        ));
    }

    public function show(Purchase $purchase): JsonResponse
    {
        $this->allow('suppliers.view');

        return response()->json(['data' => $purchase->load(['supplier', 'items.stockItem:id,name,sku,unit', 'expense'])]);
    }

    public function store(Request $request, NumberingService $numbering): JsonResponse
    {
        $this->allow('suppliers.create');
        $data = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'purchase_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.stock_item_id' => ['nullable', 'exists:stock_items,id'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_price' => ['required', 'integer', 'min:0'],
        ]);

        $purchase = DB::transaction(function () use ($data, $numbering) {
            $purchase = Purchase::create([
                'number' => $numbering->next('purchase'),
                'supplier_id' => $data['supplier_id'],
                'purchase_date' => $data['purchase_date'],
                'notes' => $data['notes'] ?? null,
                'status' => 'ordered',
                'created_by' => auth()->id(),
            ]);
            $total = 0;
            foreach ($data['items'] as $item) {
                $lineTotal = (int) round($item['quantity'] * $item['unit_price']);
                $purchase->items()->create($item + ['total' => $lineTotal]);
                $total += $lineTotal;
            }
            $purchase->update(['total' => $total]);

            return $purchase;
        });
        ActivityLogger::log('purchase.created', $purchase);

        return response()->json(['data' => $purchase->load('items', 'supplier')], 201);
    }

    public function receive(Request $request, Purchase $purchase, StockService $stock): JsonResponse
    {
        $this->allow('stock.update');
        $categoryId = $request->integer('expense_category_id')
            ?: ExpenseCategory::where('slug', 'matieres-premieres')->value('id')
            ?: ExpenseCategory::query()->value('id');
        abort_unless($categoryId, 422, 'Aucune catégorie de dépense disponible.');

        $stock->receivePurchase($purchase, $categoryId);

        return response()->json(['data' => $purchase->fresh(['items', 'supplier', 'expense']), 'message' => 'Achat réceptionné : stock et dépenses mis à jour.']);
    }

    public function cancel(Purchase $purchase): JsonResponse
    {
        $this->allow('suppliers.update');
        abort_unless($purchase->status === 'ordered', 422, 'Seul un achat non réceptionné peut être annulé.');
        $purchase->update(['status' => 'cancelled']);

        return $this->message('Achat annulé.');
    }
}
