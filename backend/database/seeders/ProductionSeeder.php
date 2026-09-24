<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Initialisation d'une installation réelle : rôles, référentiel et un super administrateur.
 * Variables : ADMIN_EMAIL, ADMIN_PASSWORD (sinon un mot de passe aléatoire est affiché une fois).
 */
class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([RolesAndPermissionsSeeder::class, ReferenceDataSeeder::class]);

        $email = env('ADMIN_EMAIL', 'direction@universgravure.com');
        if (! User::where('email', $email)->exists()) {
            $password = env('ADMIN_PASSWORD') ?: Str::password(16);
            User::create(['name' => 'Direction', 'email' => $email, 'password' => $password, 'is_active' => true, 'email_verified_at' => now()])
                ->assignRole('super_admin');
            $this->command?->warn("Super administrateur : $email / $password — changez ce mot de passe dès la première connexion.");
        }
    }
}
