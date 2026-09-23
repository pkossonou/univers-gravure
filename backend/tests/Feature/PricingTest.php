<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Finish;
use App\Models\Material;
use App\Models\Product;
use App\Services\PricingService;
use Tests\TestCase;

/** Le calculateur ne présente jamais un prix définitif quand les données ne le permettent pas. */
class PricingTest extends TestCase
{
    private function estimate(array $input): array
    {
        return app(PricingService::class)->estimate($input);
    }

    public function test_catalogue_product_gives_firm_estimate(): void
    {
        $product = $this->makeProduct();
        $r = $this->estimate(['product_id' => $product->id, 'quantity' => 2, 'size' => 'L']);

        $this->assertSame('firm', $r['confidence']);
        $this->assertSame(60000, $r['estimate_min']);   // 20 000 × 1,5 × 2
        $this->assertSame($r['estimate_min'], $r['estimate_max']);
        $this->assertStringContainsString('non contractuelle', $r['disclaimer']);
    }

    public function test_quantity_tier_personalization_and_logo_fee(): void
    {
        $product = $this->makeProduct(['base_price' => 10000, 'min_price' => null]);
        $r = $this->estimate(['product_id' => $product->id, 'quantity' => 20, 'personalizations' => ['gravure'], 'has_logo' => true]);

        // 200 000 − 5 % = 190 000 ; gravure 2 000 × 20 = 40 000 ; logo 10 000
        $this->assertSame(240000, $r['estimate_min']);
        $labels = array_column($r['breakdown'], 'label');
        $this->assertContains('Remise série 10 à 49 ex.', $labels);
        $this->assertContains('Préparation du fichier logo', $labels);
    }

    public function test_material_finish_and_express_urgency(): void
    {
        $product = $this->makeProduct(['base_price' => 10000, 'min_price' => null]);
        $brass = Material::where('slug', 'laiton')->first();            // × 1,35
        $gold = Finish::where('slug', 'or-brillant')->first();          // × 1,10

        $r = $this->estimate(['product_id' => $product->id, 'quantity' => 1, 'material_id' => $brass->id, 'finish_id' => $gold->id, 'urgency' => 'express']);

        $this->assertSame((int) round(10000 * 1.35 * 1.10 * 1.30 / 100) * 100, $r['estimate_min']);
        $this->assertLessThan(7, $r['lead_time_days']['max']);
    }

    public function test_custom_dimensions_downgrade_to_from_price(): void
    {
        $product = $this->makeProduct();
        $r = $this->estimate(['product_id' => $product->id, 'quantity' => 1, 'height_mm' => 600]);

        $this->assertSame('from', $r['confidence']);
        $this->assertGreaterThan($r['estimate_min'], $r['estimate_max']);
        $this->assertSame('Estimation à partir de', $r['label']);
    }

    public function test_projects_that_cannot_be_priced_need_team_review(): void
    {
        $onQuote = $this->makeProduct(['base_price' => null, 'is_price_visible' => false]);
        $r = $this->estimate(['product_id' => $onQuote->id, 'quantity' => 1]);
        $this->assertSame('needs_review', $r['confidence']);
        $this->assertNull($r['estimate_min']);
        $this->assertSame('Votre demande nécessite une validation par notre équipe.', $r['label']);

        $this->assertSame('needs_review', $this->estimate(['project_type' => 'autre', 'quantity' => 1])['confidence']);
        $this->assertSame('needs_review', $this->estimate(['project_type' => 'impression', 'quantity' => 1])['confidence']); // sans dimensions

        $series = $this->estimate(['product_id' => $this->makeProduct()->id, 'quantity' => 1000]);
        $this->assertSame('needs_review', $series['confidence']);
        $this->assertNotNull($series['estimate_min'], 'une grande série garde un prix indicatif « à partir de »');
    }

    public function test_area_priced_products_use_material_rate(): void
    {
        $vinyl = Material::where('slug', 'vinyle-adhesif')->first();  // 9 000 / m²
        $banner = Product::create([
            'category_id' => Category::where('slug', 'impression')->value('id'), 'reference' => 'B-1', 'name' => 'Bâche',
            'slug' => 'bache-t', 'base_price' => 6500, 'price_unit' => 'area', 'availability' => 'on_order', 'status' => 'published',
        ]);

        $r = $this->estimate(['product_id' => $banner->id, 'quantity' => 1, 'width_mm' => 2000, 'height_mm' => 1000, 'material_id' => $vinyl->id]);
        $this->assertSame('firm', $r['confidence']);
        $this->assertSame(18000, $r['estimate_min']);
    }

    public function test_estimate_endpoint_validates_input(): void
    {
        $this->postJson('/api/v1/pricing/estimate', ['quantity' => 0])->assertStatus(422)
            ->assertJsonValidationErrors(['quantity', 'project_type']);

        $this->postJson('/api/v1/pricing/estimate', ['project_type' => 'trophee', 'quantity' => 3])->assertOk()
            ->assertJsonPath('data.confidence', 'from')->assertJsonPath('data.currency', 'XOF');
    }
}
