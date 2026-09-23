<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Client;
use Tests\TestCase;

class ClientManagementTest extends TestCase
{
    public function test_create_show_update_client(): void
    {
        $this->actingAsStaff('commercial');

        $id = $this->postJson('/api/v1/admin/clients', [
            'type' => 'entreprise', 'company' => 'Horizon Assurances', 'first_name' => 'Aya',
            'email' => 'contact@horizon.example', 'phone' => '+225 07 00 00 00', 'city' => 'Abidjan',
        ])->assertCreated()->assertJsonPath('data.display_name', 'Horizon Assurances')->json('data.id');

        $this->getJson("/api/v1/admin/clients/$id")->assertOk()
            ->assertJsonPath('data.company', 'Horizon Assurances')
            ->assertJsonStructure(['projects', 'quotes', 'orders', 'history']);

        $this->putJson("/api/v1/admin/clients/$id", ['type' => 'entreprise', 'company' => 'Horizon Assurances CI'])
            ->assertOk()->assertJsonPath('data.company', 'Horizon Assurances CI');

        $this->assertTrue(ActivityLog::where('action', 'client.updated')->where('subject_id', $id)->exists());
    }

    public function test_validation_requires_a_name_or_company_and_unique_email(): void
    {
        $this->actingAsStaff('commercial');
        $this->makeClient(['email' => 'dup@client.example']);

        $this->postJson('/api/v1/admin/clients', ['type' => 'particulier', 'email' => 'dup@client.example'])
            ->assertStatus(422)->assertJsonValidationErrors(['first_name', 'company', 'email']);
        $this->postJson('/api/v1/admin/clients', ['type' => 'inconnu', 'company' => 'X'])
            ->assertStatus(422)->assertJsonValidationErrors('type');
    }

    public function test_search_and_filter(): void
    {
        $this->actingAsStaff('admin');
        $this->makeClient(['company' => 'Brasserie du Littoral', 'type' => 'entreprise']);
        $this->makeClient(['company' => 'Club de Tennis', 'type' => 'association']);

        $this->getJson('/api/v1/admin/clients?search=littoral')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.company', 'Brasserie du Littoral');
        $this->getJson('/api/v1/admin/clients?filter[type]=association')->assertOk()
            ->assertJsonPath('meta.total', 1);
        // Un filtre sur une colonne non autorisée est ignoré
        $this->getJson('/api/v1/admin/clients?filter[notes]=x')->assertOk()->assertJsonPath('meta.total', 2);
    }

    public function test_archive_and_restore_keep_history(): void
    {
        $this->actingAsStaff('admin');
        $client = $this->makeClient();

        $this->deleteJson("/api/v1/admin/clients/{$client->id}")->assertOk();
        $this->assertSoftDeleted($client);
        $this->getJson('/api/v1/admin/clients?archived=1')->assertJsonPath('meta.total', 1);

        $this->postJson("/api/v1/admin/clients/{$client->id}/restore")->assertOk();
        $this->assertNull(Client::find($client->id)->deleted_at);
    }
}
