<?php

namespace App\Http\Controllers\Admin;

use App\Events\ExpenseRecorded;
use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ExpenseRequest;
use App\Models\Expense;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class ExpenseController extends Controller
{
    use ListsRecords;

    protected ?string $dateColumn = 'expense_date';

    public function index(Request $request): JsonResponse
    {
        $this->allow('expenses.view');
        $query = Expense::query()->with(['category:id,name,color,is_direct_cost', 'supplier:id,name', 'recorder:id,name', 'order:id,number']);

        $paginator = $this->listQuery($query, $request,
            ['expense_date', 'amount', 'created_at'],
            ['expense_category_id', 'supplier_id', 'payment_method', 'order_id', 'recorded_by'],
            ['description', 'reference'],
            '-expense_date',
        );
        $paginator->getCollection()->transform(fn (Expense $e) => $e->toArray() + ['has_receipt' => (bool) $e->receipt_path]);

        // Total de la sélection filtrée (hors pagination)
        $totalQuery = Expense::query();
        foreach ((array) $request->query('filter', []) as $col => $val) {
            if (in_array($col, ['expense_category_id', 'supplier_id', 'payment_method', 'order_id'], true) && $val !== '') {
                $totalQuery->whereIn($col, explode(',', (string) $val));
            }
        }
        if ($request->query('date_from')) {
            $totalQuery->whereDate('expense_date', '>=', $request->query('date_from'));
        }
        if ($request->query('date_to')) {
            $totalQuery->whereDate('expense_date', '<=', $request->query('date_to'));
        }

        return $this->paginated($paginator, null, ['sum' => (int) $totalQuery->sum('amount')]);
    }

    public function show(Expense $expense): JsonResponse
    {
        $this->allow('expenses.view');

        return response()->json(['data' => $expense->load(['category', 'supplier', 'recorder:id,name', 'order:id,number', 'purchase:id,number'])->toArray()
            + ['has_receipt' => (bool) $expense->receipt_path]]);
    }

    public function store(ExpenseRequest $request): JsonResponse
    {
        $data = collect($request->validated())->except('receipt')->all();
        $data['recorded_by'] = auth()->id();
        if ($request->hasFile('receipt')) {
            $data['receipt_path'] = $request->file('receipt')->store('receipts/'.now()->format('Y/m'), 'local');
        }

        $expense = Expense::create($data);
        ActivityLogger::log('expense.created', $expense, $expense->description, ['amount' => $expense->amount]);
        ExpenseRecorded::dispatch($expense);

        return response()->json(['data' => $expense->load('category')], 201);
    }

    public function update(ExpenseRequest $request, Expense $expense): JsonResponse
    {
        $data = collect($request->validated())->except('receipt')->all();
        if ($request->hasFile('receipt')) {
            if ($expense->receipt_path) {
                Storage::disk('local')->delete($expense->receipt_path);
            }
            $data['receipt_path'] = $request->file('receipt')->store('receipts/'.now()->format('Y/m'), 'local');
        }
        $before = $expense->only(['amount', 'expense_date', 'expense_category_id']);
        $expense->update($data);
        ActivityLogger::log('expense.updated', $expense, null, ['before' => $before, 'after' => $expense->only(array_keys($before))]);

        return response()->json(['data' => $expense->load('category')]);
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $this->allow('expenses.delete');
        $expense->delete();
        ActivityLogger::log('expense.deleted', $expense, $expense->description, ['amount' => $expense->amount]);

        return $this->message('Dépense supprimée (archivée dans le journal).');
    }

    public function receipt(Expense $expense): Response
    {
        $this->allow('expenses.view');
        abort_unless($expense->receipt_path && Storage::disk('local')->exists($expense->receipt_path), 404);

        return Storage::disk('local')->response($expense->receipt_path, null, ['X-Content-Type-Options' => 'nosniff']);
    }
}
