<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\PortfolioItem;
use App\Services\MediaService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Importe un dossier de photos / vidéos dans les réalisations du site.
 *
 *   php artisan realisations:import ../image
 *   php artisan realisations:import ../image --replace-demo
 *
 * Un fichier facultatif `realisations.json` dans le dossier précise, par nom de fichier :
 *   [{ "file": "img3.jpeg", "title": "...", "category": "trophees", "client": "...", "year": 2026, "description": "..." }]
 * Les fichiers déjà importés (même titre) sont ignorés : la commande peut être relancée sans doublon.
 */
class ImportRealisations extends Command
{
    protected $signature = 'realisations:import {dir : Dossier contenant les images et vidéos}
                            {--replace-demo : Retire les réalisations de démonstration}
                            {--category=trophees : Catégorie par défaut}';

    protected $description = 'Importe les photos et vidéos d\'un dossier dans la galerie « Réalisations »';

    private const IMAGES = ['jpg', 'jpeg', 'png', 'webp'];

    private const VIDEOS = ['mp4', 'webm', 'mov'];

    public function handle(MediaService $media): int
    {
        $dir = rtrim($this->argument('dir'), '/\\');
        if (! is_dir($dir)) {
            $this->error("Dossier introuvable : $dir");

            return self::FAILURE;
        }

        $manifest = collect(is_file("$dir/realisations.json") ? json_decode((string) file_get_contents("$dir/realisations.json"), true) ?? [] : [])
            ->keyBy('file');

        if ($this->option('replace-demo')) {
            $removed = PortfolioItem::query()->where('image_url', 'like', '/visuals/%')->delete();
            $this->info("$removed réalisation(s) de démonstration retirée(s).");
        }

        $order = (int) PortfolioItem::max('sort_order');
        $imported = 0;

        foreach (scandir($dir) as $file) {
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (! in_array($ext, [...self::IMAGES, ...self::VIDEOS], true)) {
                continue;
            }
            $meta = $manifest->get($file, []);
            // Le logo de l'entreprise n'est pas une réalisation
            if (($meta['skip'] ?? false) === true || str_contains(strtolower($file), 'logo')) {
                $this->line("  ignoré (manifeste) : $file");

                continue;
            }

            $title = $meta['title'] ?? Str::headline(pathinfo($file, PATHINFO_FILENAME));
            if (PortfolioItem::where('title', $title)->exists()) {
                $this->line("  déjà présent : $title");

                continue;
            }

            $path = "$dir/$file";
            $isVideo = in_array($ext, self::VIDEOS, true);
            $url = $media->storeLocal($path, 'portfolio');
            [$w, $h] = $isVideo ? [16, 9] : (getimagesize($path) ?: [1, 1]);
            $ratio = abs($w - $h) / max($w, $h) < 0.08 ? 'square' : ($w > $h ? 'landscape' : 'portrait');

            PortfolioItem::create([
                'title' => $title,
                'slug' => Str::slug($title).'-'.Str::lower(Str::random(4)),
                'category' => $meta['category'] ?? $this->option('category'),
                'client_label' => $meta['client'] ?? null,
                'description' => $meta['description'] ?? null,
                'image_url' => $isVideo ? ($meta['poster'] ?? null) : $url,
                'video_url' => $isVideo ? $url : null,
                'ratio' => $meta['ratio'] ?? $ratio,
                'year' => $meta['year'] ?? null,
                'is_published' => true,
                'sort_order' => ++$order,
            ]);
            $imported++;
            $this->info("  + $title");

            // « cover »: true → la photo devient le visuel de la catégorie du catalogue du même nom
            if (($meta['cover'] ?? false) && ! $isVideo) {
                Category::where('slug', $meta['category'] ?? $this->option('category'))->update(['image_url' => $url]);
            }
        }

        Cache::forget('catalog.categories');
        $this->info("$imported réalisation(s) importée(s).");

        return self::SUCCESS;
    }
}
