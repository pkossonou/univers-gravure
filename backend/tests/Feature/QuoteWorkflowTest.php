<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Order;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\Quote;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Demande publique (sans compte, recontact WhatsApp) → devis → validation saisie par l'équipe
 * → commande + ordre de production.
 */
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
            'contact_phone' => '+225 07 00 00 00 01',
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
        $this->assertSame('+225 07 00 00 00 01', $project->client->phone);
        $this->assertSame('CHAMPION 2026', $project->personalization['text']);
        $this->assertNull(ProjectFile::where('upload_token', $token)->first(), 'le jeton est consommé');
    }

    public function test_whatsapp_number_is_enough_and_identifies_returning_clients(): void
    {
        $first = $this->submitProject(['contact_email' => null, 'contact_phone' => '0500000009']);
        $second = $this->submitProject(['contact_email' => null, 'contact_phone' => '0500000009']);

        $a = Project::where('number', $first['number'])->firstOrFail();
        $b = Project::where('number', $second['number'])->firstOrFail();
        $this->assertNull($a->contact_email);
        $this->assertSame($a->client_id, $b->client_id);
        $this->assertSame(1, Client::where('phone', '0500000009')->count());
    }

    public function test_photo_model_request_requires_a_photo_and_keeps_it(): void
    {
        Storage::fake('local');
        $payload = [
            'channel' => 'photo_model',
            'project_type' => 'trophee',
            'contact_name' => 'Client Test',
            'contact_phone' => '07 00 00 00 02',
            'quantity' => 3,
            'description' => 'Souhait : reproduire le modèle en photo.',
            'configuration' => ['reproduction' => 'identique', 'colors' => ['Or'], 'budget' => null],
            'consent' => true,
        ];

        $this->postJson('/api/v1/projects', $payload)
            ->assertStatus(422)->assertJsonPath('errors.file_tokens.0', 'Ajoutez au moins une photo du modèle souhaité.');

        $token = $this->post('/api/v1/uploads', ['file' => UploadedFile::fake()->image('modele.jpg', 600, 800), 'kind' => 'photo'])
            ->assertCreated()->json('data.token');
        $data = $this->postJson('/api/v1/projects', $payload + ['file_tokens' => [$token]])->assertCreated()->json('data');

        $this->assertSame(1, $data['files_count']);
        $project = Project::where('number', $data['number'])->firstOrFail();
        $this->assertSame('photo_model', $project->channel);
        $this->assertSame(['Or'], $project->configuration['colors']);
        $this->assertSame(1, $project->files()->count());
    }

    public function test_submission_validation_and_honeypot(): void
    {
        $this->postJson('/api/v1/projects', ['project_type' => 'fusee', 'quantity' => 0])
            ->assertStatus(422)->assertJsonValidationErrors(['project_type', 'quantity', 'contact_name', 'contact_phone', 'consent'])
            ->assertJsonMissingValidationErrors('contact_email');

        $this->postJson('/api/v1/projects', [
            'project_type' => 'trophee', 'contact_name' => 'Bot', 'contact_phone' => '0700000003',
            'quantity' => 1, 'consent' => true, 'website' => 'spam',
        ])->assertStatus(422)->assertJsonValidationErrors('website');
    }

    public function test_public_tracking_requires_matching_whatsapp_or_email(): void
    {
        $data = $this->submitProject();
        $url = "/api/v1/projects/track/{$data['number']}?contact=";

        $this->getJson($url.urlencode('autre@x.example'))->assertNotFound();
        $this->getJson($url.urlencode('07 99 99 99 99'))->assertNotFound();
        $this->getJson($url.urlencode('aya@client.example'))->assertOk();
        // Même numéro saisi sans indicatif ni espaces
        $this->getJson($url.'0700000001')->assertOk()
            ->assertJsonPath('data.timeline.stages.0.state', 'done')
            ->assertJsonPath('data.timeline.stages.1.state', 'current');
    }

    public function test_full_quote_to_order_flow_with_server_side_totals(): void
    {
        $client = $this->makeClient();
        $project = Project::create([
            'number' => 'DEM-TEST-1', 'client_id' => $client->id, 'project_type' => 'trophee',
            'contact_name' => 'Aya', 'contact_phone' => '0700000004', 'quantity' => 10, 'status' => 'new',
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

        $this->postJson("/api/v1/admin/quotes/{$quote['id']}/send")->assertOk();
        $this->assertSame('quote_sent', $project->fresh()->status);

        // Le client valide sur WhatsApp ; l'équipe enregistre l'accord
        Sanctum::actingAs($this->staff('admin'));
        $orderId = $this->postJson("/api/v1/admin/quotes/{$quote['id']}/accept")->assertCreated()->json('data.id');

        $order = Order::with('productionOrders.steps', 'items')->findOrFail($orderId);
        $this->assertSame('validated', $order->status);
        $this->assertSame($quote['total'], $order->total);
        $this->assertSame(200000, $order->cost_estimate);
        $this->assertCount(2, $order->items);
        $this->assertCount(1, $order->productionOrders);
        $this->assertCount(6, $order->productionOrders->first()->steps);
        $this->assertSame('converted', Quote::find($quote['id'])->status);
        $this->assertSame('validated', $project->fresh()->status);

        // Un devis ne peut pas être accepté deux fois
        $this->postJson("/api/v1/admin/quotes/{$quote['id']}/accept")->assertStatus(422);
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

    public function test_team_records_a_customer_refusal(): void
    {
        $quote = Quote::create(['number' => 'DEV-X-2', 'client_id' => $this->makeClient()->id, 'status' => 'sent', 'total' => 5000]);

        Sanctum::actingAs($this->staff('commercial'));
        $this->postJson("/api/v1/admin/quotes/{$quote->id}/reject", ['reason' => 'Budget'])->assertOk();
        $this->assertSame('rejected', $quote->fresh()->status);
        $this->assertSame('Budget', $quote->fresh()->rejection_reason);
    }

    public function test_customer_area_no_longer_exists(): void
    {
        [$user] = $this->clientAccount();
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/me/quotes')->assertNotFound();
        $this->postJson('/api/v1/auth/register', ['name' => 'X'])->assertNotFound();
    }
}
