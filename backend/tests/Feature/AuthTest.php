<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_login_success_and_failure(): void
    {
        $user = $this->staff('commercial');

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertStatus(422)->assertJsonValidationErrors('email');

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'Password123'])
            ->assertOk()->assertJsonPath('user.is_staff', true)->assertJsonStructure(['token']);

        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_validation_messages_are_in_french(): void
    {
        $this->postJson('/api/v1/auth/login', [])
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Le champ e-mail est obligatoire.')
            ->assertJsonPath('errors.password.0', 'Le champ mot de passe est obligatoire.');

        $this->postJson('/api/v1/auth/login', ['email' => 'pas-un-email', 'password' => 'x'])
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Le champ e-mail doit être une adresse e-mail valide.');
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
        $this->getJson('/api/v1/admin/dashboard')->assertStatus(401);
    }

    public function test_client_cannot_access_back_office(): void
    {
        [$user] = $this->clientAccount();
        $this->actingAs($user, 'sanctum')->getJson('/api/v1/admin/clients')->assertForbidden();
    }

    public function test_only_the_team_can_log_in(): void
    {
        [$user] = $this->clientAccount();

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'Password123'])
            ->assertStatus(422)->assertJsonPath('errors.email.0', "L'accès est réservé à l'équipe UNIVERS GRAVURE.");
    }
}
