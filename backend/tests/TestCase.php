<?php

namespace Tests;

use App\Models\Category;
use App\Models\Client;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /** Base MySQL de test migrée et amorcée une fois, puis une transaction par test. */
    protected bool $seed = true;

    protected string $seeder = TestSeeder::class;

    protected function staff(string $role = 'admin'): User
    {
        $user = User::create([
            'name' => ucfirst($role).' Test',
            'email' => $role.uniqid().'@test.example',
            'password' => 'Password123',
            'is_active' => true,
        ]);
        $user->assignRole($role);

        return $user;
    }

    protected function actingAsStaff(string $role = 'admin'): User
    {
        $user = $this->staff($role);
        Sanctum::actingAs($user);

        return $user;
    }

    /** @return array{0: User, 1: Client} */
    protected function clientAccount(): array
    {
        $user = User::create(['name' => 'Aya Test', 'email' => 'aya'.uniqid().'@test.example', 'password' => 'Password123', 'is_active' => true]);
        $user->assignRole('client');
        $client = Client::create(['user_id' => $user->id, 'type' => 'particulier', 'first_name' => 'Aya', 'last_name' => 'Test', 'email' => $user->email]);

        return [$user, $client];
    }

    protected function makeClient(array $attrs = []): Client
    {
        return Client::create($attrs + ['type' => 'entreprise', 'company' => 'Société Test '.uniqid(), 'email' => uniqid().'@client.example']);
    }

    protected function makeProduct(array $attrs = []): Product
    {
        return Product::create($attrs + [
            'category_id' => Category::where('slug', 'trophees')->value('id'),
            'reference' => 'T-'.uniqid(),
            'name' => 'Trophée test',
            'slug' => 'trophee-test-'.uniqid(),
            'base_price' => 20000,
            'min_price' => 15000,
            'price_unit' => 'unit',
            'is_price_visible' => true,
            'availability' => 'on_order',
            'lead_time_min_days' => 3,
            'lead_time_max_days' => 7,
            'dimensions' => ['width' => 100, 'height' => 300, 'depth' => 100],
            'size_options' => [['label' => 'S', 'height_mm' => 300, 'multiplier' => 1], ['label' => 'L', 'height_mm' => 450, 'multiplier' => 1.5]],
            'personalization_types' => ['gravure'],
            'status' => 'published',
        ]);
    }
}
