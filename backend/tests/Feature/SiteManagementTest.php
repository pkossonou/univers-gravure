<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\PortfolioItem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Gestion du site depuis le back-office : médias des réalisations et textes éditables. */
class SiteManagementTest extends TestCase
{
    private function storedPath(string $url): string
    {
        return substr($url, strlen(rtrim(Storage::disk('public')->url(''), '/')) + 1);
    }

    public function test_admin_uploads_replaces_and_deletes_a_realisation_photo(): void
    {
        Storage::fake('public');
        $this->actingAsStaff('designer');

        $item = $this->post('/api/v1/admin/portfolio', [
            'title' => 'Trophée Pass Mousso', 'category' => 'trophees', 'ratio' => 'portrait', 'is_published' => '1',
            'image' => UploadedFile::fake()->image('trophee.jpg', 800, 1000),
        ], ['Accept' => 'application/json'])->assertCreated()->json('data');

        $first = $this->storedPath($item['image_url']);
        Storage::disk('public')->assertExists($first);

        // Remplacement (méthode PUT simulée en multipart) : l'ancien fichier est effacé
        $this->post("/api/v1/admin/portfolio/{$item['id']}", [
            '_method' => 'PUT', 'title' => 'Trophée Pass Mousso', 'category' => 'trophees', 'ratio' => 'portrait',
            'image' => UploadedFile::fake()->image('nouvelle.jpg', 800, 1000),
        ], ['Accept' => 'application/json'])->assertOk();
        Storage::disk('public')->assertMissing($first);
        $second = $this->storedPath(PortfolioItem::find($item['id'])->image_url);
        Storage::disk('public')->assertExists($second);

        $this->deleteJson("/api/v1/admin/portfolio/{$item['id']}")->assertOk();
        Storage::disk('public')->assertMissing($second);
        $this->assertDatabaseMissing('portfolio_items', ['id' => $item['id']]);
    }

    public function test_realisation_requires_a_photo_or_a_video_and_rejects_other_files(): void
    {
        Storage::fake('public');
        $this->actingAsStaff('admin');

        $this->postJson('/api/v1/admin/portfolio', ['title' => 'Sans visuel', 'category' => 'trophees', 'ratio' => 'portrait'])
            ->assertStatus(422)->assertJsonPath('errors.image_url.0', 'Ajoutez une image ou une vidéo.');

        $this->post('/api/v1/admin/portfolio', [
            'title' => 'Fichier piégé', 'category' => 'trophees', 'ratio' => 'portrait',
            'image' => UploadedFile::fake()->create('script.php', 10, 'text/x-php'),
        ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('image');

        $this->post('/api/v1/admin/portfolio', [
            'title' => 'Vidéo atelier', 'category' => 'evenements', 'ratio' => 'landscape',
            'video' => UploadedFile::fake()->create('atelier.mp4', 2048, 'video/mp4'),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.image_url', null);
    }

    public function test_commercial_cannot_manage_the_gallery_or_texts(): void
    {
        $this->actingAsStaff('commercial');
        $this->postJson('/api/v1/admin/portfolio', ['title' => 'x'])->assertForbidden();
        $this->putJson('/api/v1/admin/content', ['content' => ['hero.subtitle' => 'x']])->assertForbidden();
    }

    public function test_category_image_upload(): void
    {
        Storage::fake('public');
        $this->actingAsStaff('admin');
        $cat = Category::where('slug', 'trophees')->first();

        $this->post("/api/v1/admin/categories/{$cat->id}", [
            '_method' => 'PUT', 'name' => $cat->name, 'slug' => $cat->slug,
            'image' => UploadedFile::fake()->image('cover.png', 1200, 900),
        ], ['Accept' => 'application/json'])->assertOk();

        Storage::disk('public')->assertExists($this->storedPath($cat->fresh()->image_url));
    }

    public function test_site_texts_are_editable_and_public(): void
    {
        // Clés contenant un point : lecture directe du JSON (assertJsonPath les interpréterait comme un chemin)
        $content = $this->getJson('/api/v1/content')->assertOk()->json('data');
        $this->assertSame('Nous donnons', $content['hero.title_1']);
        $this->assertCount(5, $content['faq']);

        $this->actingAsStaff('admin');
        $this->getJson('/api/v1/admin/content')->assertOk()->assertJsonStructure(['data', 'fields' => [['key', 'label', 'section']]]);

        $this->putJson('/api/v1/admin/content', ['content' => [
            'hero.subtitle' => '<b>Trophées</b> sur mesure à Abidjan',
            'faq' => [['q' => 'Livrez-vous ?', 'a' => 'Oui.'], ['q' => '', 'a' => 'ignorée']],
            'cle.inconnue' => 'ignorée',
        ]])->assertOk();

        $content = $this->getJson('/api/v1/content')->json('data');
        $this->assertSame('Trophées sur mesure à Abidjan', $content['hero.subtitle']); // HTML retiré
        $this->assertCount(1, $content['faq']);                                         // entrée vide ignorée
        $this->assertArrayNotHasKey('cle.inconnue', $content);
    }

    public function test_import_command_is_idempotent_and_skips_the_logo(): void
    {
        Storage::fake('public');
        $dir = sys_get_temp_dir().'/ug-import-'.uniqid();
        mkdir($dir);
        imagejpeg(imagecreatetruecolor(400, 600), "$dir/photo1.jpg");
        imagejpeg(imagecreatetruecolor(500, 500), "$dir/LOGO.jpg");
        file_put_contents("$dir/realisations.json", json_encode([['file' => 'photo1.jpg', 'title' => 'Grand Prix', 'category' => 'trophees', 'cover' => true]]));

        $this->artisan('realisations:import', ['dir' => $dir])->assertSuccessful();
        $this->artisan('realisations:import', ['dir' => $dir])->assertSuccessful();

        $this->assertSame(1, PortfolioItem::count());
        $item = PortfolioItem::first();
        $this->assertSame('Grand Prix', $item->title);
        $this->assertSame('portrait', $item->ratio);
        $this->assertSame($item->image_url, Category::where('slug', 'trophees')->value('image_url'));
    }
}
