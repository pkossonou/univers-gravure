<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\Quote;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Demande publique → devis → validation client → commande + ordre de production. */
class QuoteWorkflowTest extends TestCase
{
    private function submitProject(array $overrides = []): array
    {
        return $this->postJson('/api/v1/projects', $overrides + [
            'channel' => 'studio',
            'project_type' => 'trophee',
            'product_id' => $this->makeProduct()->id,
            'contact_name' => 'Aya Kouassi',
            'contact_email' => 'aya@client.example',
            'quantity' => 10,
            'personalization' => ['modes' => ['gravure'], 'text' => 'CHAMPION 2026', 'align' => 'center', 'color' => '#D4AF6A'],
            'configuration' => ['size' => 'L', 'shape' => 'cup'],
            'consent' => true,
        ])->assertCreated()->json('data');
    }

    public function test_public_submission_creates_project_client_and_estimate(): void
    {
        Storage::fake('local');
        $token = $this->post('/api/v1/uploads', ['file' => UploadedFile::fake()->image('logo.png', 400, 400), 'kind' => 'logo'])
            ->assertCreated()->json('data.token');

        $data = $this->submitProject(['file_tokens' => [$token]]);

        $this->assertMatchesRegularExpression('/^DEM-\d{4}-\d{5}$/', $data['number']);
        $this->assertSame(1, $data['files_count']);
        $this->assertNotNull($data['estimate']['min']);

        $project = Project::where('number', $data['number'])->firstOrFail();
        $this->assertSame('aya@client.example', $project->client->email);
        $this->assertSame('CHAMPION 2026', $project->personalization['text']);
        $this->assertNull(ProjectFile::where('upload_token', $token)->first(), 'le jeton est consommé');
    }

    public function test_submission_validation_and_honeypot(): void
    {
        $this->postJson('/api/v1/projects', ['project_type' => 'fusee', 'quantity' => 0])
            ->assertStatus(422)->assertJsonValidationErrors(['project_type', 'quantity', 'contact_name', 'contact_email', 'consent']);

        $this->postJson('/api/v1/projects', [
            'project_type' => 'trophee', 'contact_name' => 'Bot', 'contact_email' => 'bot@x.example',
            'quantity' => 1, 'consent' => true, 'website' => 'spam',
        ])->assertStatus(422)->assertJsonValidationErrors('website');
    }

    public function test_public_tracking_requires_matching_email(): void
    {
        $data = $this->submitProject();

        $this->getJson("/api/v1/projects/track/{$data['number']}?email=autre@x.example")->assertNotFound();
        $this->getJson("/api/v1/projects/track/{$data['number']}?email=aya@client.example")->assertOk()
            ->assertJsonPath('data.timeline.stages.0.state', 'done')
            ->assertJsonPath('data.timeline.stages.1.state', 'current');
    }

    public function test_full_quote_to_order_flow_with_server_side_totals(): void
    {
        [$clientUser, $client] = $this->clientAccount();
        $project = Project::create([
            'number' => 'DEM-TEST-1', 'client_id' => $client->id, 'project_type' => 'trophee',
            'contact_name' => 'Aya', 'contact_email' => $client->email, 'quantity' => 10, 'status' => 'new',
        ]);

        // Le commercial prépare le devis ; les totaux envoyés par le navigateur sont ignorés
        Sanctum::actingAs($this->staff('commercial'));
        $quote = $this->postJson('/api/v1/admin/quotes', [
            'client_id' => $client->id, 'project_id' => $project->id, 'tax_rate' => 18, 'discount_amount' => 10000,
            'total' => 1, 'subtotal' => 1,
            'items' => [
                ['description' => 'Coupe Prestige L', 'quantity' => 10, 'unit_price' => 45000, 'unit_cost' => 20000],
                ['description' => 'Gravure', 'quantity' => 10, 'unit_price' => 2000, 'discount' => 2000],
            ],
        ])->assertCreated()->json('data');

        $this->assertSame(468000, $quote['subtotal']);                  // 450 000 + 20 000 − 2 000
        $this->assertSame((int) round(458000 * 0.18), $quote['tax_amount']);
        $this->assertSame(458000 + (int) round(458000 * 0.18), $quote['total']);
        $this->assertSame('quote_preparing', $project->fresh()->status);

        // Brouillon invisible côté client
        Sanctum::actingAs($clientUser);
        $this->getJson("/api/v1/me/quotes/{$quote['id']}")->assertNotFound();

        Sanctum::actingAs($this->staff('commercial'));
        $this->postJson("/api/v1/admin/quotes/{$quote['id']}/send")->assertOk();
        $this->assertSame('quote_sent', $project->fresh()->status);

        // Le client consulte (→ en attente de validation) puis accepte
        Sanctum::actingAs($clientUser);
        $this->getJson("/api/v1/me/quotes/{$quote['id']}")->assertOk()->assertJsonMissingPath('data.items.0.unit_cost');
        $this->assertSame('awaiting_validation', $project->fresh()->status);
        $orderId = $this->postJson("/api/v1/me/quotes/{$quote['id']}/accept")->assertOk()->json('order_id');

        $order = Order::with('productionOrders.steps', 'items')->findOrFail($orderId);
        $this->assertSame('validated', $order->status);
        $this->assertSame($quote['total'], $order->total);
        $this->assertSame(200000, $order->cost_estimate);
        $this->assertCount(2, $order->items);
        $this->assertCount(1, $order->productionOrders);
        $this->assertCount(6, $order->productionOrders->first()->steps);
        $this->assertSame('converted', Quote::find($quote['id'])->status);
        $this->assertSame('validated', $project->fresh()->status);

        // Le client suit sa commande ; les étapes internes lui sont masquées
        $this->getJson("/api/v1/me/orders/$orderId")->assertOk()
            ->assertJsonPath('data.timeline.stages.2.state', 'done')
            ->assertJsonPath('data.timeline.stages.3.state', 'current')
            ->assertJsonCount(3, 'data.production.0.steps');

        // Un devis ne peut pas être accepté deux fois
        $this->postJson("/api/v1/me/quotes/{$quote['id']}/accept")->assertStatus(422);
    }

    public function test_client_cannot_see_another_clients_documents(): void
    {
        [, $owner] = $this->clientAccount();
        [$intruder] = $this->clientAccount();
        $quote = Quote::create(['number' => 'DEV-X-1', 'client_id' => $owner->id, 'status' => 'sent', 'total' => 1000]);

        Sanctum::actingAs($intruder);
        $this->getJson("/api/v1/me/quotes/{$quote->id}")->assertNotFound();
        $this->postJson("/api/v1/me/quotes/{$quote->id}/accept")->assertNotFound();
        $this->getJson('/api/v1/me/quotes')->assertOk()->assertJsonPath('meta.total', 0);
    }

    public function test_draft_quote_from_project_uses_pricing_engine(): void
    {
        $data = $this->submitProject();
        $project = Project::where('number', $data['number'])->first();
        Sanctum::actingAs($this->staff('commercial'));

        $quote = $this->postJson("/api/v1/admin/projects/{$project->id}/draft-quote")->assertCreated()->json('data');
        $this->assertSame('draft', $quote['status']);
        $this->assertSame(10, $quote['items'][0]['quantity']);
        $this->assertEqualsWithDelta($project->estimate_min, $quote['total'], 10);
    }

    public function test_client_can_reject_a_quote(): void
    {
        [$user, $client] = $this->clientAccount();
        $quote = Quote::create(['number' => 'DEV-X-2', 'client_id' => $client->id, 'status' => 'sent', 'total' => 5000]);

        Sanctum::actingAs($user);
        $this->postJson("/api/v1/me/quotes/{$quote->id}/reject", ['reason' => 'Budget'])->assertOk();
        $this->assertSame('rejected', $quote->fresh()->status);
        $this->assertSame('Budget', $quote->fresh()->rejection_reason);
    }
}
