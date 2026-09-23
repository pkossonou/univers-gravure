<?php

namespace Tests\Feature;

use App\Models\ExpenseCategory;
use App\Models\ProjectFile;
use App\Models\Purchase;
use App\Models\StockItem;
use App\Models\Supplier;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SecurityAndStockTest extends TestCase
{
    public function test_upload_rejects_forbidden_extensions_and_disguised_files(): void
    {
        Storage::fake('local');

        $this->post('/api/v1/uploads', ['file' => UploadedFile::fake()->create('shell.php', 1, 'text/x-php')], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('file');

        // Script PHP renommé en .png : le type MIME réel est détecté et refusé
        // (vrai fichier temporaire : les faux fichiers de test devinent le MIME depuis le nom)
        $path = tempnam(sys_get_temp_dir(), 'ug');
        file_put_contents($path, "<?php\nsystem(\$_GET['c']);\n");
        $disguised = new UploadedFile($path, 'logo.png', null, null, true);
        $this->post('/api/v1/uploads', ['file' => $disguised], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('errors.file.0', 'Type de fichier non autorisé.');

        $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        $this->post('/api/v1/uploads', ['file' => $svg], ['Accept' => 'application/json'])->assertStatus(422);

        $clean = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>');
        $this->post('/api/v1/uploads', ['file' => $clean], ['Accept' => 'application/json'])->assertCreated();
    }

    public function test_client_files_require_a_valid_signature(): void
    {
        Storage::fake('local');
        $this->post('/api/v1/uploads', ['file' => UploadedFile::fake()->image('p.jpg', 500, 500)], ['Accept' => 'application/json'])->assertCreated();
        $file = ProjectFile::latest('id')->first();

        $this->get('/api/v1/files/'.$file->id)->assertForbidden();
        $this->get($file->temporaryUrl())->assertOk();
    }

    public function test_security_headers_are_sent(): void
    {
        $this->getJson('/api/v1/catalog/categories')->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY');
    }

    public function test_stock_movements_and_low_stock_alert(): void
    {
        $manager = $this->staff('admin');
        $this->actingAsStaff('production');
        $item = StockItem::create(['name' => 'Plexi 20 mm', 'sku' => 'PLX-T', 'type' => 'raw_material', 'unit' => 'feuille', 'quantity' => 10, 'alert_threshold' => 4, 'unit_cost' => 50000]);

        $this->postJson("/api/v1/admin/stock-items/{$item->id}/movements", ['type' => 'out', 'quantity' => 20, 'reason' => 'Test'])
            ->assertStatus(422)->assertJsonValidationErrors('quantity');

        $this->postJson("/api/v1/admin/stock-items/{$item->id}/movements", ['type' => 'out', 'quantity' => 7, 'reason' => 'Commande'])->assertCreated();
        $this->assertEquals(3, $item->fresh()->quantity);
        $this->assertTrue($item->fresh()->is_low);
        $this->assertSame(1, $manager->notifications()->where('data->type', 'stock_low')->count());

        $this->postJson("/api/v1/admin/stock-items/{$item->id}/movements", ['type' => 'adjustment', 'quantity' => 12, 'reason' => 'Inventaire'])->assertCreated();
        $this->assertEquals(12, $item->fresh()->quantity);
        $this->assertSame(['out', 'adjustment'], $item->movements()->oldest('id')->pluck('type')->all());

        $this->getJson('/api/v1/admin/stock-items?low=1')->assertOk()->assertJsonPath('meta.total', 0);
    }

    public function test_receiving_a_purchase_updates_stock_and_records_expense(): void
    {
        $this->actingAsStaff('admin');
        $supplier = Supplier::create(['name' => 'Fournisseur test']);
        $item = StockItem::create(['name' => 'Laiton', 'sku' => 'LAI-T', 'type' => 'raw_material', 'unit' => 'feuille', 'quantity' => 2, 'unit_cost' => 10000]);

        $purchase = $this->postJson('/api/v1/admin/purchases', [
            'supplier_id' => $supplier->id, 'purchase_date' => today()->toDateString(),
            'items' => [['stock_item_id' => $item->id, 'description' => 'Laiton', 'quantity' => 8, 'unit_price' => 12500]],
        ])->assertCreated()->json('data');
        $this->assertSame(100000, $purchase['total']);

        $this->postJson("/api/v1/admin/purchases/{$purchase['id']}/receive")->assertOk();
        $this->assertEquals(10, $item->fresh()->quantity);
        $this->assertSame(12000, $item->fresh()->unit_cost);  // coût moyen pondéré
        $this->assertDatabaseHas('expenses', [
            'purchase_id' => $purchase['id'], 'amount' => 100000,
            'expense_category_id' => ExpenseCategory::where('slug', 'matieres-premieres')->value('id'),
        ]);
        $this->postJson("/api/v1/admin/purchases/{$purchase['id']}/receive")->assertStatus(422);
        $this->assertSame('received', Purchase::find($purchase['id'])->status);
    }
}
