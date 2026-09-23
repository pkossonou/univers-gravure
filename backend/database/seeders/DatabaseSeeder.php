<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class DatabaseSeeder extends Seeder
{
    /**
     * php artisan db:seed                      → référentiel + démonstration complète
     * php artisan db:seed --class=ProductionSeeder → référentiel seul (mise en production)
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            ReferenceDataSeeder::class,
            CatalogSeeder::class,
            DemoSeeder::class,
        ]);

        // Vraies réalisations de l'atelier (dossier « image » à la racine du projet), si présentes
        $photos = base_path('../image');
        if (is_dir($photos)) {
            $this->command?->info('Import des réalisations depuis '.$photos);
            Artisan::call('realisations:import', ['dir' => $photos, '--replace-demo' => true]);
        }
    }
}
