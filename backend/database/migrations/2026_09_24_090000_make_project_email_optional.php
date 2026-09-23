<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Plus de compte client : l'équipe recontacte sur WhatsApp. Le numéro devient
 * obligatoire (validation) et l'e-mail facultatif.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('contact_email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('contact_email')->nullable(false)->change();
        });
    }
};
