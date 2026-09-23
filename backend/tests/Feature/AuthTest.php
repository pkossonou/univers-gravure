<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_register_creates_client_account_and_returns_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Koffi Test',
            'email' => 'Koffi@Test.example',
            'company' => 'Tech Lagune',
            'password' => 'Secret123',
            'password_confirmation' => 'Secret123',
        ]);

        $response->assertCreated()->assertJsonStructure(['token', 'user' => ['id', 'roles', 'client']]);
        $user = User::where('email', 'koffi@test.example')->firstOrFail();
        $this->assertTrue($user->hasRole('client'));
        $this->assertFalse($user->isStaff());
        $this->assertSame('entreprise', $user->client->type);
    }

    public function test_register_links_existing_client_record_and_past_requests(): void
    {
        $client = Client::create(['type' => 'particulier', 'first_name' => 'Aya', 'email' => 'aya@test.example']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Aya', 'email' => 'aya@test.example', 'password' => 'Secret123', 'password_confirmation' => 'Secret123',
        ])->assertCreated();

        $this->assertNotNull($client->fresh()->user_id);
        $this->assertSame(1, Client::where('email', 'aya@test.example')->count());
    }

    public function test_register_rejects_weak_password_and_duplicate_email(): void
    {
        $this->staff('admin')->update(['email' => 'taken@test.example']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'X', 'email' => 'taken@test.example', 'password' => 'short', 'password_confirmation' => 'short',
        ])->assertStatus(422)->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_success_and_failure(): void
    {
        $user = $this->staff('commercial');

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertStatus(422)->assertJsonValidationErrors('email');

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'Password123'])
            ->assertOk()->assertJsonPath('user.is_staff', true)->assertJsonStructure(['token']);

        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $user = $this->staff('admin');
        $user->update(['is_active' => false]);

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'Password123'])->assertStatus(422);
    }

    public function test_logout_revokes_token(): void
    {
        $user = $this->staff('admin');
        $token = $user->createToken('web')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk();
        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_protected_routes_require_authentication(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
        $this->getJson('/api/v1/me/orders')->assertStatus(401);
        $this->getJson('/api/v1/admin/dashboard')->assertStatus(401);
    }

    public function test_client_cannot_access_back_office(): void
    {
        [$user] = $this->clientAccount();
        $this->actingAs($user, 'sanctum')->getJson('/api/v1/admin/clients')->assertForbidden();
    }
}
