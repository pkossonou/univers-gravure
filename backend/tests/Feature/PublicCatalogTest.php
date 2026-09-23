<?php

namespace Tests\Feature;

use App\Models\DigitalCertificate;
use App\Models\Material;
use App\Models\QrCode;
use Tests\TestCase;

class PublicCatalogTest extends TestCase
{
    public function test_catalog_lists_only_published_products_and_filters(): void
    {
        $brass = Material::where('slug', 'laiton')->first();
        $this->makeProduct(['name' => 'Coupe Laiton'])->materials()->attach($brass);
        $this->makeProduct(['name' => 'Brouillon secret', 'status' => 'draft']);
        $this->makeProduct(['name' => 'Coupe Cristal', 'base_price' => 90000]);

        $this->getJson('/api/v1/catalog/products')->assertOk()->assertJsonPath('meta.total', 2);
        $this->getJson('/api/v1/catalog/products?material=laiton')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.name', 'Coupe Laiton');
        $this->getJson('/api/v1/catalog/products?price_max=50000')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/catalog/products?search=cristal')->assertJsonPath('data.0.name', 'Coupe Cristal');
        $this->getJson('/api/v1/catalog/products?sort=price_desc')->assertJsonPath('data.0.name', 'Coupe Cristal');
    }

    public function test_product_page_hides_internal_fields_and_counts_views(): void
    {
        $product = $this->makeProduct(['is_price_visible' => false]);

        $this->getJson("/api/v1/catalog/products/{$product->slug}")->assertOk()
            ->assertJsonPath('data.price.base', null)
            ->assertJsonPath('data.price.on_quote', true)
            ->assertJsonMissingPath('data.status')
            ->assertJsonMissingPath('data.min_price');
        $this->assertSame(1, $product->fresh()->views_count);
    }

    public function test_connected_trophy_page_and_certificate_verification(): void
    {
        $qr = QrCode::create(['code' => 'UGTEST01', 'type' => 'trophy', 'title' => 'Meilleur buteur', 'recipient_name' => 'Kader', 'is_public' => true, 'is_active' => true]);
        $cert = new DigitalCertificate(['number' => 'CERT-T-1', 'qr_code_id' => $qr->id, 'recipient_name' => 'Kader', 'award_title' => 'Meilleur buteur', 'issued_on' => '2026-05-01']);
        $cert->verification_hash = $cert->computeHash();
        $cert->save();

        $this->getJson('/api/v1/trophies/ugtest01')->assertOk()
            ->assertJsonPath('data.recipient_name', 'Kader')
            ->assertJsonPath('data.certificate.number', 'CERT-T-1');
        $this->assertSame(1, $qr->fresh()->scans_count);

        $this->getJson('/api/v1/certificates/CERT-T-1')->assertOk()->assertJsonPath('data.is_authentic', true);
        $this->get('/api/v1/certificates/CERT-T-1/pdf')->assertOk()->assertHeader('content-type', 'application/pdf');

        // Toute altération des données certifiées est détectée
        DigitalCertificate::whereKey($cert->id)->update(['recipient_name' => 'Imposteur']);
        $this->getJson('/api/v1/certificates/CERT-T-1')->assertJsonPath('data.is_authentic', false);

        $qr->update(['is_public' => false]);
        $this->getJson('/api/v1/trophies/UGTEST01')->assertNotFound();
    }

    public function test_contact_form_creates_a_lead(): void
    {
        $this->postJson('/api/v1/contact', ['name' => 'Paul', 'email' => 'paul@x.example', 'message' => 'Bonjour, je souhaite des médailles.'])->assertCreated();
        $this->assertDatabaseHas('leads', ['email' => 'paul@x.example', 'source' => 'formulaire_contact', 'status' => 'new']);
    }
}
