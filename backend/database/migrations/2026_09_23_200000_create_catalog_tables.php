<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catalogue : catégories, matériaux, finitions, tags, produits, variantes, images.
 * Montants en FCFA (entiers).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();
            $table->string('icon', 50)->nullable();
            $table->string('image_url')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('show_in_services')->default(false);
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 320)->nullable();
            $table->timestamps();
        });

        Schema::create('materials', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('color_hex', 9)->nullable();
            // Multiplicateur appliqué au prix de base (1.000 = neutre)
            $table->decimal('price_multiplier', 6, 3)->default(1);
            // Prix au m² pour les produits vendus à la surface (impression, signalétique)
            $table->unsignedInteger('price_per_m2')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('finishes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->decimal('price_multiplier', 6, 3)->default(1);
            $table->unsignedInteger('flat_fee')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug');
            // general | usage | event
            $table->string('type', 20)->default('general')->index();
            $table->timestamps();
            $table->unique(['slug', 'type']);
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('reference', 40)->unique();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('short_description', 320)->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('base_price')->nullable();
            $table->unsignedInteger('min_price')->nullable();
            // unit : prix unitaire ; area : prix au m² (dimensions requises)
            $table->string('price_unit', 10)->default('unit');
            $table->boolean('is_price_visible')->default(true);
            // in_stock | on_order | unavailable
            $table->string('availability', 20)->default('on_order')->index();
            $table->unsignedSmallInteger('lead_time_min_days')->default(3);
            $table->unsignedSmallInteger('lead_time_max_days')->default(7);
            // {width, height, depth} en mm — dimensions de référence
            $table->json('dimensions')->nullable();
            // Tailles proposées : [{label, height_mm, multiplier}]
            $table->json('size_options')->nullable();
            // Options libres : [{key, label, values[]}]
            $table->json('options')->nullable();
            // gravure | impression | uv | sublimation | broderie ...
            $table->json('personalization_types')->nullable();
            $table->boolean('is_configurable')->default(false);
            // cup | star | column | plaque | medal | crystal — modèle 3D procédural
            $table->string('model_3d', 20)->nullable();
            $table->integer('stock_quantity')->nullable();
            // draft | published | archived
            $table->string('status', 20)->default('draft')->index();
            $table->boolean('is_featured')->default(false)->index();
            $table->unsignedInteger('views_count')->default(0);
            $table->unsignedInteger('requests_count')->default(0);
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 320)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'category_id']);
            $table->index('base_price');
            $table->fullText(['name', 'short_description']);
        });

        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('sku', 50)->unique();
            $table->string('name');
            $table->json('attributes')->nullable();
            $table->unsignedInteger('price')->nullable();
            $table->integer('stock_quantity')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('path')->nullable();
            $table->string('url')->nullable();
            $table->string('alt');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
        });

        Schema::create('material_product', function (Blueprint $table) {
            $table->foreignId('material_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['material_id', 'product_id']);
        });

        Schema::create('finish_product', function (Blueprint $table) {
            $table->foreignId('finish_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['finish_id', 'product_id']);
        });

        Schema::create('product_tag', function (Blueprint $table) {
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['product_id', 'tag_id']);
        });

        Schema::create('portfolio_items', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            // trophees | medailles | plaques | gravure | impression | evenements | entreprises | cadeaux
            $table->string('category', 30)->index();
            $table->string('client_label')->nullable();
            $table->text('description')->nullable();
            $table->string('image_url');
            $table->string('before_image_url')->nullable();
            $table->string('video_url')->nullable();
            // Ratio pour la grille masonry : portrait | landscape | square
            $table->string('ratio', 12)->default('portrait');
            $table->unsignedSmallInteger('year')->nullable();
            $table->boolean('is_published')->default(true)->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_items');
        Schema::dropIfExists('product_tag');
        Schema::dropIfExists('finish_product');
        Schema::dropIfExists('material_product');
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('finishes');
        Schema::dropIfExists('materials');
        Schema::dropIfExists('categories');
    }
};
