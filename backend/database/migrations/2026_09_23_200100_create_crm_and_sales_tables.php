<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CRM (clients, prospects), demandes/projets, fichiers, devis, règles tarifaires.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            // particulier | entreprise | association | administration | etablissement_scolaire
            $table->string('type', 30)->default('particulier')->index();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('company')->nullable();
            $table->string('email')->nullable()->index();
            $table->string('phone', 30)->nullable()->index();
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable()->index();
            $table->string('country', 100)->default("Côte d'Ivoire");
            $table->string('source', 50)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('company')->nullable();
            $table->string('email')->nullable()->index();
            $table->string('phone', 30)->nullable();
            $table->string('source', 50)->nullable();
            // new | contacted | qualified | converted | lost
            $table->string('status', 20)->default('new')->index();
            $table->string('interest')->nullable();
            $table->unsignedBigInteger('estimated_value')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('converted_client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('number', 30)->unique();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // quote_form | studio | configurator | scan | calculator | contact | admin
            $table->string('channel', 20)->default('quote_form')->index();
            // trophee | medaille | plaque | gravure | impression | signaletique | objet | cadeau | autre
            $table->string('project_type', 30)->index();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('material_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('finish_id')->nullable()->constrained()->nullOnDelete();
            $table->string('contact_name');
            $table->string('contact_email');
            $table->string('contact_phone', 30)->nullable();
            $table->string('company')->nullable();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->unsignedInteger('width_mm')->nullable();
            $table->unsignedInteger('height_mm')->nullable();
            $table->unsignedInteger('depth_mm')->nullable();
            // Texte, police, couleur, alignement, emplacement, logo…
            $table->json('personalization')->nullable();
            // État complet du configurateur / studio
            $table->json('configuration')->nullable();
            $table->date('desired_date')->nullable();
            // standard | express | flexible
            $table->string('urgency', 20)->default('standard');
            $table->unsignedBigInteger('estimate_min')->nullable();
            $table->unsignedBigInteger('estimate_max')->nullable();
            // firm | from | needs_review
            $table->string('estimate_confidence', 20)->nullable();
            // new | quote_preparing | quote_sent | awaiting_validation | validated | rejected | cancelled
            $table->string('status', 30)->default('new')->index();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('contact_email');
            $table->index('created_at');
        });

        Schema::create('project_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained()->cascadeOnDelete();
            // Jeton temporaire avant rattachement à une demande
            $table->string('upload_token', 64)->nullable()->unique();
            $table->string('original_name');
            $table->string('disk', 20)->default('local');
            $table->string('path');
            $table->string('mime_type', 100);
            $table->string('extension', 10);
            $table->unsignedBigInteger('size');
            // logo | maquette | photo | document | scan | autre
            $table->string('kind', 20)->default('autre');
            // pending | attached | reviewed | rejected
            $table->string('status', 20)->default('pending');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->string('number', 30)->unique();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            // draft | sent | accepted | rejected | expired | converted
            $table->string('status', 20)->default('draft')->index();
            $table->date('issued_at')->nullable()->index();
            $table->date('valid_until')->nullable();
            $table->unsignedBigInteger('subtotal')->default(0);
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->unsignedBigInteger('tax_amount')->default(0);
            $table->unsignedBigInteger('total')->default(0);
            $table->text('notes')->nullable();
            $table->text('terms')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->string('rejection_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('quote_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description');
            $table->unsignedInteger('quantity')->default(1);
            $table->unsignedBigInteger('unit_price')->default(0);
            // Coût de revient estimé (pour la marge prévisionnelle)
            $table->unsignedBigInteger('unit_cost')->nullable();
            $table->unsignedBigInteger('discount')->default(0);
            $table->unsignedBigInteger('total')->default(0);
            $table->json('options')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('pricing_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            // quantity_tier | urgency | personalization | setup | category_base
            $table->string('type', 30)->index();
            $table->foreignId('category_id')->nullable()->constrained()->cascadeOnDelete();
            // Conditions : {min_qty, max_qty, urgency, personalization}
            $table->json('conditions')->nullable();
            $table->decimal('amount', 12, 2);
            // percent | fixed | per_unit
            $table->string('amount_type', 20)->default('percent');
            $table->unsignedSmallInteger('priority')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_rules');
        Schema::dropIfExists('quote_items');
        Schema::dropIfExists('quotes');
        Schema::dropIfExists('project_files');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('leads');
        Schema::dropIfExists('clients');
    }
};
