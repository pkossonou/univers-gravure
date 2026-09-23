<?php

namespace App\Http\Controllers\Api;

use App\Events\ClientCreated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Client;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => strtolower($data['email']),
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
            ]);
            $user->assignRole('client');

            // Rattache la fiche client existante (demandes passées sans compte) ou en crée une
            $client = Client::query()->whereNull('user_id')->where('email', $user->email)->first();
            if ($client) {
                $client->update(['user_id' => $user->id]);
                // Les demandes antérieures deviennent visibles dans l'espace client
                $client->projects()->whereNull('user_id')->update(['user_id' => $user->id]);
            } else {
                [$first, $last] = array_pad(explode(' ', trim($data['name']), 2), 2, null);
                $client = Client::create([
                    'user_id' => $user->id,
                    'type' => ! empty($data['company']) ? 'entreprise' : 'particulier',
                    'first_name' => $first,
                    'last_name' => $last,
                    'company' => $data['company'] ?? null,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'source' => 'inscription',
                ]);
                ClientCreated::dispatch($client);
            }

            return $user;
        });

        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user' => $this->userPayload($user),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', strtolower($request->email))->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages(['email' => 'Identifiants incorrects.']);
        }
        if (! $user->is_active) {
            throw ValidationException::withMessages(['email' => 'Ce compte est désactivé. Contactez un administrateur.']);
        }

        $user->forceFill(['last_login_at' => now()])->save();
        auth()->setUser($user);
        ActivityLogger::log('auth.login', $user, 'Connexion');

        return response()->json([
            'token' => $user->createToken($request->device_name ?: 'web')->plainTextToken,
            'user' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->message('Déconnecté.');
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userPayload($request->user())]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'company' => ['nullable', 'string', 'max:190'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
        ]);

        $user->update(['name' => $data['name'], 'phone' => $data['phone'] ?? null]);
        $user->client?->update(array_filter([
            'phone' => $data['phone'] ?? null,
            'company' => $data['company'] ?? null,
            'address' => $data['address'] ?? null,
            'city' => $data['city'] ?? null,
        ], fn ($v) => $v !== null));

        return response()->json(['user' => $this->userPayload($user->fresh())]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'current_password:sanctum'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $user = $request->user();
        $user->update(['password' => $request->password]);
        // Révoque les autres sessions
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();
        ActivityLogger::log('auth.password_changed', $user);

        return $this->message('Mot de passe mis à jour.');
    }

    /** @return array<string, mixed> */
    private function userPayload(User $user): array
    {
        $user->loadMissing('client');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->hasRole('super_admin')
                ? ['*']
                : $user->getAllPermissions()->pluck('name')->values(),
            'is_staff' => $user->isStaff(),
            'client' => $user->client?->only(['id', 'display_name', 'company', 'phone', 'address', 'city', 'type']),
        ];
    }
}
