<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserRequest;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Comptes de l'équipe (les comptes clients se gèrent via la fiche client). */
class UserController extends Controller
{
    use ListsRecords;

    public function index(Request $request): JsonResponse
    {
        $this->allow('users.view');
        $query = User::query()->with('roles:id,name')->role(User::STAFF_ROLES);
        if ($role = $request->query('role')) {
            $query->role($role);
        }
        $paginator = $this->listQuery($query, $request, ['name', 'email', 'created_at', 'last_login_at'], ['is_active'], ['name', 'email']);
        $paginator->getCollection()->transform(fn (User $u) => $this->payload($u));

        return $this->paginated($paginator);
    }

    public function store(UserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = User::create(collect($data)->except('role')->all() + ['email_verified_at' => now()]);
        $user->syncRoles([$data['role']]);
        ActivityLogger::log('user.created', $user, null, ['role' => $data['role']]);

        return response()->json(['data' => $this->payload($user)], 201);
    }

    public function update(UserRequest $request, User $user): JsonResponse
    {
        $this->guardSuperAdmin($user);
        $data = $request->validated();
        if (empty($data['password'])) {
            unset($data['password']);
        }
        if ($user->id === auth()->id() && isset($data['is_active']) && ! $data['is_active']) {
            return $this->message('Vous ne pouvez pas désactiver votre propre compte.', 422);
        }

        $user->update(collect($data)->except('role')->all());
        $user->syncRoles([$data['role']]);
        if (isset($data['is_active']) && ! $data['is_active']) {
            $user->tokens()->delete();
        }
        ActivityLogger::log('user.updated', $user, null, ['role' => $data['role']]);

        return response()->json(['data' => $this->payload($user)]);
    }

    public function destroy(User $user): JsonResponse
    {
        $this->allow('users.delete');
        $this->guardSuperAdmin($user);
        abort_if($user->id === auth()->id(), 422, 'Vous ne pouvez pas supprimer votre propre compte.');
        $user->tokens()->delete();
        $user->delete();
        ActivityLogger::log('user.deleted', $user);

        return $this->message('Utilisateur désactivé et archivé.');
    }

    /** Matrice rôles → permissions (lecture seule, source : App\Support\Permissions). */
    public function roles(): JsonResponse
    {
        $this->allow('users.view');

        return response()->json(['data' => collect(Permissions::matrix())
            ->except('client')
            ->map(fn ($perms, $role) => ['role' => $role, 'label' => Permissions::ROLE_LABELS[$role], 'permissions' => $perms])
            ->values()]);
    }

    private function guardSuperAdmin(User $target): void
    {
        abort_if($target->hasRole('super_admin') && ! auth()->user()->hasRole('super_admin'), 403, 'Seul un super administrateur peut modifier ce compte.');
    }

    private function payload(User $user): array
    {
        $role = $user->roles->first()?->name ?? $user->getRoleNames()->first();

        return $user->only(['id', 'name', 'email', 'phone', 'is_active', 'last_login_at', 'created_at'])
            + ['role' => $role, 'role_label' => Permissions::ROLE_LABELS[$role] ?? $role];
    }
}
