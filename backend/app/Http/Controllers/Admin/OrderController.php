<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\ActivityLogger;
use App\Services\InvoiceService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    use ListsRecords;

    protected ?string $dateColumn = 'ordered_at';

    public function __construct(private OrderService $orders) {}

    public function index(Request $request): JsonResponse
    {
        $this->allow('orders.view');
        $query = Order::query()->with(['client:id,company,first_name,last_name', 'productionOrders.steps']);
        if ($request->boolean('late')) {
            $query->whereIn('status', Order::OPEN_STATUSES)->whereDate('due_date', '<', today());
        }

        return $this->paginated($this->listQuery($query, $request,
            ['created_at', 'ordered_at', 'due_date', 'total', 'number', 'status'],
            ['status', 'payment_status', 'client_id', 'delivery_method'],
            ['number'],
        ), OrderResource::class, [
            'counts' => Order::query()->selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status'),
        ]);
    }

    public function show(Order $order): JsonResponse
    {
        $this->allow('orders.view');
        $order->load(['client', 'quote', 'project.files', 'items', 'statusHistory.user:id,name', 'productionOrders.steps', 'invoices', 'payments', 'expenses', 'qrCodes']);

        $data = (new OrderResource($order))->resolve();
        $data['qr_codes'] = $order->qrCodes->map->only(['id', 'code', 'title', 'recipient_name', 'public_url']);
        if (auth()->user()->can('finance.view')) {
            // Marge réelle de la commande : CA − coûts directs imputés
            $data['margin'] = [
                'cost_estimate' => $order->cost_estimate,
                'direct_expenses' => (int) $order->expenses->sum('amount'),
                'estimated' => $order->total - $order->tax_amount - max($order->cost_estimate, (int) $order->expenses->sum('amount')),
            ];
        }

        return response()->json(['data' => $data]);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $this->allow('orders.update');
        $data = $request->validate([
            'due_date' => ['sometimes', 'nullable', 'date'],
            'delivery_method' => ['sometimes', Rule::in(['pickup', 'delivery'])],
            'delivery_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);
        $order->update($data);
        $order->productionOrders()->whereNotIn('status', ['done', 'cancelled'])->update(['due_at' => $order->due_date]);
        ActivityLogger::log('order.updated', $order, null, $data);

        return response()->json(['data' => new OrderResource($order)]);
    }

    public function status(Request $request, Order $order): JsonResponse
    {
        $this->allow('orders.update');
        $data = $request->validate([
            'status' => ['required', Rule::in(Order::STATUSES)],
            'comment' => ['nullable', 'string', 'max:255'],
            'is_client_visible' => ['boolean'],
        ]);
        $this->orders->transition($order, $data['status'], $data['comment'] ?? null, $data['is_client_visible'] ?? true);

        return response()->json(['data' => new OrderResource($order->fresh(['statusHistory', 'productionOrders.steps']))]);
    }

    public function invoice(Order $order, InvoiceService $invoices): JsonResponse
    {
        $this->allow('invoices.create');
        $invoice = $invoices->createFromOrder($order);

        return response()->json(['data' => new InvoiceResource($invoice->load('client', 'order')), 'message' => 'Facture '.$invoice->number.' émise.'], 201);
    }
}
