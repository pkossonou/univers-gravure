<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Quote;
use App\Services\QuoteService;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
{
    private function order(): Order
    {
        $this->actingAs($this->staff('admin'));
        $client = $this->makeClient();
        $quote = app(QuoteService::class)->save(null, ['client_id' => $client->id, 'tax_rate' => 0, 'discount_amount' => 0], [
            ['description' => 'Médailles', 'quantity' => 100, 'unit_price' => 2500, 'unit_cost' => 1200],
        ]);
        app(QuoteService::class)->send($quote);

        return app(QuoteService::class)->accept($quote->fresh());
    }

    public function test_status_transitions_are_recorded_and_closed_orders_are_locked(): void
    {
        $order = $this->order();
        Sanctum::actingAs($this->staff('production'));

        $this->postJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'in_production', 'comment' => 'Gravure lancée'])->assertOk();
        $this->postJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'ready'])->assertOk();
        $this->postJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'completed'])->assertOk();

        $order->refresh();
        $this->assertSame('completed', $order->status);
        $this->assertNotNull($order->completed_at);
        $this->assertSame(['validated', 'in_production', 'ready', 'completed'], $order->statusHistory->pluck('to_status')->all());
        $this->assertSame('done', $order->productionOrders->first()->status);

        $this->postJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'in_production'])->assertStatus(422);
        $this->postJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'teleporte'])->assertStatus(422);
    }

    public function test_completing_all_production_steps_marks_order_ready(): void
    {
        $order = $this->order();
        Sanctum::actingAs($this->staff('production'));
        $steps = $order->productionOrders->first()->steps;

        $this->patchJson("/api/v1/admin/production-steps/{$steps[0]->id}", ['status' => 'in_progress'])->assertOk();
        $this->assertSame('in_design', $order->fresh()->status);

        foreach ($steps as $step) {
            $this->patchJson("/api/v1/admin/production-steps/{$step->id}", ['status' => 'done'])->assertOk();
        }

        $this->assertSame('ready', $order->fresh()->status);
        $this->assertSame('done', $order->productionOrders()->first()->status);
    }

    public function test_invoice_and_payments_update_balances(): void
    {
        $order = $this->order();
        Sanctum::actingAs($this->staff('comptabilite'));

        $invoice = $this->postJson("/api/v1/admin/orders/{$order->id}/invoice")->assertCreated()->json('data');
        $this->assertSame(250000, $invoice['total']);
        $this->assertSame('issued', $invoice['status']);
        $this->postJson("/api/v1/admin/orders/{$order->id}/invoice")->assertStatus(422);

        $this->postJson("/api/v1/admin/invoices/{$invoice['id']}/payments", ['amount' => 100000, 'method' => 'mobile_money', 'paid_at' => today()->toDateString()])
            ->assertCreated()->assertJsonPath('data.status', 'partially_paid')->assertJsonPath('data.balance', 150000);
        $this->assertSame('partial', $order->fresh()->payment_status);

        $this->postJson("/api/v1/admin/invoices/{$invoice['id']}/payments", ['amount' => 200000, 'method' => 'cash', 'paid_at' => today()->toDateString()])
            ->assertStatus(422)->assertJsonValidationErrors('amount');

        $this->postJson("/api/v1/admin/invoices/{$invoice['id']}/payments", ['amount' => 150000, 'method' => 'cash', 'paid_at' => today()->toDateString()])
            ->assertCreated()->assertJsonPath('data.status', 'paid');
        $this->assertSame('paid', $order->fresh()->payment_status);

        $this->postJson("/api/v1/admin/invoices/{$invoice['id']}/cancel")->assertStatus(422);
    }

    public function test_expired_quote_cannot_be_accepted(): void
    {
        $this->actingAs($this->staff('admin'));
        $quote = Quote::create(['number' => 'DEV-OLD', 'client_id' => $this->makeClient()->id, 'status' => 'sent', 'valid_until' => today()->subDays(3), 'total' => 1000]);

        Sanctum::actingAs($this->staff('commercial'));
        $this->postJson("/api/v1/admin/quotes/{$quote->id}/accept")->assertStatus(422);
        $this->assertSame('expired', $quote->fresh()->status);
    }
}
