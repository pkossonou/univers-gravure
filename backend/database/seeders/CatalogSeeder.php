<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Finish;
use App\Models\Material;
use App\Models\PortfolioItem;
use App\Models\Product;
use App\Models\Tag;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Catalogue de démonstration. Les visuels sont des rendus vectoriels génériques
 * (frontend/public/visuals) à remplacer par les photos réelles depuis le back-office.
 */
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $cat = Category::pluck('id', 'slug');
        $mat = Material::pluck('id', 'slug');
        $fin = Finish::pluck('id', 'slug');
        $tag = Tag::get()->keyBy(fn ($t) => $t->type.':'.$t->slug)->map->id;

        $trophySizes = [
            ['label' => 'S — 28 cm', 'height_mm' => 280, 'multiplier' => 1],
            ['label' => 'M — 36 cm', 'height_mm' => 360, 'multiplier' => 1.35],
            ['label' => 'L — 45 cm', 'height_mm' => 450, 'multiplier' => 1.8],
        ];
        $medalSizes = [
            ['label' => 'Ø 50 mm', 'height_mm' => 50, 'multiplier' => 1],
            ['label' => 'Ø 70 mm', 'height_mm' => 70, 'multiplier' => 1.45],
        ];
        $plaqueSizes = [
            ['label' => 'A5 — 15 × 21 cm', 'height_mm' => 210, 'multiplier' => 1],
            ['label' => 'A4 — 21 × 30 cm', 'height_mm' => 300, 'multiplier' => 1.6],
        ];

        // [ref, nom, catégorie, prix, prix min, modèle 3D, visuel, matériaux, finitions, perso, usages, événements, tailles, dims, configurable, vedette, description courte]
        $products = [
            ['TRO-001', 'Coupe Prestige', 'trophees', 45000, 30000, 'cup', 'trophy-cup-gold', ['laiton', 'zamak-dore'], ['or-brillant', 'argent-satine', 'bronze-antique'], ['gravure'], ['sport', 'institution'], ['tournoi-de-football', 'gala-ceremonie'], $trophySizes, [180, 360, 180], true, true, 'Coupe en métal sur socle marbre noir, plaque gravée incluse.'],
            ['TRO-002', 'Coupe Victoire', 'trophees', 32000, 22000, 'cup', 'trophy-cup-silver', ['aluminium-brosse', 'zamak-dore'], ['argent-satine', 'or-brillant'], ['gravure'], ['sport', 'scolaire'], ['tournoi-de-football', 'remise-de-diplomes'], $trophySizes, [160, 320, 160], true, false, 'La coupe classique des championnats, finition argent satiné.'],
            ['TRO-003', 'Étoile Champion', 'trophees', 28000, 18000, 'star', 'trophy-star', ['zamak-dore', 'laiton'], ['or-brillant', 'effet-miroir'], ['gravure'], ['sport', 'entreprise'], ['gala-ceremonie'], $trophySizes, [150, 300, 90], true, true, 'Étoile facettée sur colonne, pour les meilleurs éléments.'],
            ['TRO-004', 'Colonne Olympe', 'trophees', 22000, 15000, 'column', 'trophy-column', ['aluminium-brosse', 'plexiglas-acrylique'], ['or-brillant', 'argent-satine', 'bronze-antique'], ['gravure', 'impression'], ['sport', 'scolaire', 'association'], ['tournoi-de-football'], $trophySizes, [120, 300, 120], true, false, 'Trophée colonne modulable, idéal pour les séries.'],
            ['TRO-005', 'Cristal Horizon', 'trophees', 55000, 40000, 'crystal', 'crystal-award', ['cristal-optique'], [], ['gravure', 'uv'], ['entreprise', 'institution'], ['gala-ceremonie', 'seminaire'], [['label' => 'M — 20 cm', 'height_mm' => 200, 'multiplier' => 1], ['label' => 'L — 26 cm', 'height_mm' => 260, 'multiplier' => 1.4]], [140, 200, 50], true, true, 'Bloc de cristal optique gravé au laser en profondeur.'],
            ['TRO-006', 'Signature Acrylique', 'trophees', 18000, 12000, 'crystal', 'acrylic-award', ['plexiglas-acrylique'], [], ['uv', 'gravure'], ['entreprise', 'association'], ['seminaire', 'salon-foire'], [], [120, 180, 20], true, false, 'Trophée acrylique 20 mm imprimé UV en couleurs.'],
            ['MED-001', 'Médaille Frappée', 'medailles', 2500, 1500, 'medal', 'medal-gold', ['zamak-dore'], ['or-brillant', 'argent-satine', 'bronze-antique'], ['gravure', 'impression'], ['sport', 'scolaire'], ['tournoi-de-football', 'remise-de-diplomes'], $medalSizes, [50, 50, 3], true, true, 'Médaille métal avec ruban tricolore personnalisable.'],
            ['MED-002', 'Médaille Acrylique', 'medailles', 1800, 1200, 'medal', 'medal-silver', ['plexiglas-acrylique'], [], ['uv'], ['sport', 'association'], ['tournoi-de-football'], $medalSizes, [60, 60, 4], true, false, 'Médaille acrylique imprimée en couleur, légère et économique.'],
            ['MED-003', 'Médaille Bronze Antique', 'medailles', 4500, 3000, 'medal', 'medal-bronze', ['laiton'], ['bronze-antique'], ['gravure'], ['institution', 'scolaire'], ['gala-ceremonie', 'remise-de-diplomes'], $medalSizes, [70, 70, 4], true, false, 'Finition bronze vieilli, gravure du nom au dos.'],
            ['PLA-001', 'Plaque Honorifique Acajou', 'plaques', 35000, 25000, 'plaque', 'plaque-wood', ['bois-noble-acajou', 'laiton'], ['or-brillant'], ['gravure'], ['entreprise', 'institution'], ['depart-a-la-retraite', 'gala-ceremonie'], $plaqueSizes, [210, 300, 18], true, true, 'Support acajou verni, plaque laiton gravée.'],
            ['PLA-002', 'Plaque Inox Gravée', 'plaques', 28000, 20000, 'plaque', 'plaque-steel', ['acier-inoxydable'], ['argent-satine', 'noir-mat'], ['gravure'], ['entreprise', 'institution'], ['seminaire'], $plaqueSizes, [210, 300, 3], true, false, 'Inox brossé 1,5 mm, gravure laser fibre indélébile.'],
            ['PLA-003', 'Plaque Commémorative Laiton', 'plaques', 60000, 45000, 'plaque', 'plaque-brass', ['laiton'], ['or-brillant', 'bronze-antique'], ['gravure'], ['institution', 'association'], ['gala-ceremonie'], $plaqueSizes, [300, 400, 4], true, false, 'Pour inaugurations et lieux de mémoire, fixation murale.'],
            ['GRV-001', 'Stylo Métal Gravé', 'gravure', 6500, 4000, null, 'pen', ['aluminium-brosse', 'laiton'], ['noir-mat', 'argent-satine'], ['gravure'], ['entreprise', 'particulier'], ['seminaire', 'anniversaire'], [], [10, 140, 10], false, false, 'Stylo roller en métal, gravure du nom ou du logo.'],
            ['GRV-002', 'Coffret Bois Gravé', 'gravure', 12000, 8000, null, 'wood-engraving', ['bois-noble-acajou', 'mdf'], [], ['gravure'], ['particulier', 'entreprise'], ['mariage', 'anniversaire'], [], [200, 80, 150], false, false, 'Boîte en bois gravée au laser, message et motifs.'],
            ['GRV-003', 'Gourde Inox Gravée', 'gravure', 9000, 6000, null, 'bottle', ['acier-inoxydable'], ['noir-mat', 'argent-satine'], ['gravure'], ['entreprise', 'sport'], ['seminaire', 'salon-foire'], [], [70, 260, 70], false, false, 'Gourde isotherme 500 ml, gravure logo à 360°.'],
            ['IMP-001', 'Bâche Grand Format', 'impression', 6500, 15000, null, 'banner', ['bache-pvc-510-g'], [], ['impression'], ['entreprise', 'association'], ['salon-foire', 'gala-ceremonie'], [], null, false, true, 'Bâche PVC 510 g, œillets tous les 50 cm, qualité extérieure.', 'area'],
            ['IMP-002', 'Roll-up 85 × 200', 'impression', 45000, 45000, null, 'rollup', [], [], ['impression'], ['entreprise'], ['salon-foire', 'seminaire'], [], [850, 2000, 0], false, false, 'Enrouleur aluminium et visuel haute définition, housse incluse.'],
            ['IMP-003', 'Impression UV sur Dibond', 'impression', 24000, 20000, null, 'dibond-panel', ['dibond-aluminium-composite'], [], ['uv'], ['entreprise', 'institution'], [], [], null, false, false, 'Panneau rigide 3 mm, impression directe UV haute définition.', 'area'],
            ['SIG-001', 'Plaque de Porte', 'signaletique', 15000, 10000, 'plaque', 'door-sign', ['plexiglas-acrylique', 'aluminium-brosse'], ['noir-mat', 'argent-satine'], ['gravure', 'uv'], ['entreprise', 'institution'], [], [], [200, 80, 5], true, false, 'Signalétique de bureaux et salles, fixation entretoises.'],
            ['SIG-002', 'Lettres Découpées 3D', 'signaletique', null, null, null, 'letters-3d', ['plexiglas-acrylique', 'acier-inoxydable', 'dibond-aluminium-composite'], ['laque-couleur', 'effet-miroir'], ['decoupe'], ['entreprise'], [], [], null, false, true, 'Logo et lettrage en relief pour façades et accueils. Sur devis.'],
            ['SIG-003', 'Caisson Lumineux', 'signaletique', null, null, null, 'lightbox', ['dibond-aluminium-composite', 'plexiglas-acrylique'], [], ['impression'], ['entreprise'], [], [], null, false, false, 'Enseigne LED simple ou double face. Étude et pose sur devis.'],
            ['OBJ-001', 'Mug Céramique', 'objets-personnalises', 3500, 2500, null, 'mug', [], [], ['sublimation'], ['entreprise', 'particulier'], ['anniversaire', 'seminaire'], [], [85, 95, 85], false, false, 'Mug 33 cl sublimé, tenue lave-vaisselle.'],
            ['OBJ-002', 'Porte-clés Métal', 'objets-personnalises', 2000, 1200, null, 'keyring', ['aluminium-brosse', 'zamak-dore'], [], ['gravure'], ['entreprise', 'association'], ['salon-foire'], [], [40, 60, 3], false, false, 'Porte-clés gravé recto verso, idéal goodies.'],
            ['OBJ-003', 'Tee-shirt Sublimé', 'objets-personnalises', 5000, 3500, null, 'tshirt', [], [], ['sublimation', 'impression'], ['sport', 'entreprise', 'association'], ['tournoi-de-football', 'seminaire'], [], null, false, false, 'Tee-shirt polyester respirant, impression toutes couleurs.'],
            ['CAD-001', 'Coffret Prestige', 'cadeaux-entreprise', 25000, 18000, null, 'gift-box', ['bois-noble-acajou', 'cuir'], [], ['gravure'], ['entreprise'], ['seminaire', 'depart-a-la-retraite'], [], [260, 70, 180], false, true, 'Stylo, carnet cuir et clé USB gravés dans un coffret bois.'],
            ['CAD-002', 'Carnet Cuir Gravé', 'cadeaux-entreprise', 12000, 8000, null, 'notebook', ['cuir'], [], ['gravure', 'marquage'], ['entreprise', 'particulier'], ['seminaire', 'anniversaire'], [], [150, 210, 20], false, false, 'Carnet A5 couverture cuir, marquage à chaud ou gravure.'],
            ['PUB-001', 'Stand Parapluie', 'supports-publicitaires', 180000, 150000, null, 'stand', [], [], ['impression'], ['entreprise'], ['salon-foire'], [], [3000, 2250, 0], false, false, 'Stand courbé 3 × 3, structure et visuel, valise de transport.'],
            ['PUB-002', 'Beach Flag', 'supports-publicitaires', 55000, 45000, null, 'beach-flag', [], [], ['impression'], ['entreprise', 'sport'], ['salon-foire', 'tournoi-de-football'], [], [800, 3000, 0], false, false, 'Drapeau voile 3 m avec mât et pied, impression recto.'],
        ];

        foreach ($products as $p) {
            [$ref, $name, $category, $price, $min, $model, $visual, $materials, $finishes, $perso, $usages, $events, $sizes, $dims, $configurable, $featured, $short] = $p;
            $priceUnit = $p[17] ?? 'unit';

            $product = Product::updateOrCreate(['reference' => $ref], [
                'category_id' => $cat[$category],
                'name' => $name,
                'slug' => Str::slug($name),
                'short_description' => $short,
                'description' => $short."\n\nChaque pièce est préparée dans notre atelier d'Abidjan : vérification du fichier, BAT envoyé pour validation, fabrication et contrôle qualité avant remise.",
                'base_price' => $price,
                'min_price' => $min,
                'price_unit' => $priceUnit,
                'is_price_visible' => $price !== null,
                'availability' => $price === null ? 'on_order' : (in_array($category, ['medailles', 'objets-personnalises'], true) ? 'in_stock' : 'on_order'),
                'lead_time_min_days' => $price === null ? 7 : 3,
                'lead_time_max_days' => $price === null ? 21 : ($category === 'trophees' ? 7 : 5),
                'dimensions' => $dims ? ['width' => $dims[0], 'height' => $dims[1], 'depth' => $dims[2]] : null,
                'size_options' => $sizes ?: null,
                'personalization_types' => $perso,
                'is_configurable' => $configurable,
                'model_3d' => $model,
                'status' => 'published',
                'is_featured' => $featured,
                'views_count' => random_int(40, 900),
                'seo_title' => $name.' personnalisé à Abidjan | UNIVERS GRAVURE',
                'seo_description' => $short.' Fabriqué à Abidjan par UNIVERS GRAVURE.',
            ]);

            $product->materials()->sync(array_map(fn ($s) => $mat[$s], $materials));
            $product->finishes()->sync(array_map(fn ($s) => $fin[$s], $finishes));
            $product->tags()->sync(array_merge(
                array_map(fn ($s) => $tag['usage:'.$s], $usages),
                array_map(fn ($s) => $tag['event:'.$s], $events),
            ));
            $product->images()->delete();
            $product->images()->create(['url' => '/visuals/'.$visual.'.svg', 'alt' => $name.' — rendu UNIVERS GRAVURE', 'is_primary' => true, 'sort_order' => 0]);
        }

        $portfolio = [
            ['Coupes du tournoi inter-entreprises', 'trophees', 'Tournoi corporate — Abidjan', 'trophy-cup-gold', 'portrait', 2026],
            ['Médailles de fin de saison', 'medailles', 'Académie de football', 'medal-gold', 'square', 2026],
            ['Gala des excellences', 'evenements', 'Cérémonie annuelle', 'crystal-award', 'portrait', 2025],
            ['Plaques de départ à la retraite', 'plaques', 'Direction des ressources humaines', 'plaque-wood', 'landscape', 2025],
            ['Signalétique de siège social', 'entreprises', 'Immeuble de bureaux — Plateau', 'letters-3d', 'landscape', 2026],
            ['Coffrets cadeaux clients', 'cadeaux', 'Fin d\'année', 'gift-box', 'square', 2025],
            ['Stand salon professionnel', 'impression', 'Salon de l\'habitat', 'stand', 'landscape', 2026],
            ['Étoiles des meilleurs vendeurs', 'trophees', 'Convention commerciale', 'trophy-star', 'portrait', 2025],
            ['Gravure de gourdes inox', 'gravure', 'Séminaire d\'équipe', 'bottle', 'portrait', 2026],
            ['Plaque inaugurale', 'plaques', 'Inauguration d\'un bâtiment', 'plaque-brass', 'landscape', 2025],
            ['Médailles bronze — remise de diplômes', 'medailles', 'Établissement scolaire', 'medal-bronze', 'square', 2025],
            ['Bâches événementielles', 'impression', 'Festival de quartier', 'banner', 'landscape', 2026],
            ['Trophées acryliques', 'evenements', 'Hackathon étudiant', 'acrylic-award', 'portrait', 2026],
            ['Plaques de porte', 'entreprises', 'Clinique privée', 'door-sign', 'landscape', 2025],
            ['Carnets cuir gravés', 'cadeaux', 'Conseil d\'administration', 'notebook', 'portrait', 2026],
            ['Colonnes de championnat', 'trophees', 'Ligue de jeunes', 'trophy-column', 'portrait', 2025],
        ];
        foreach ($portfolio as $i => [$title, $category, $client, $visual, $ratio, $year]) {
            PortfolioItem::updateOrCreate(['slug' => Str::slug($title)], [
                'title' => $title, 'category' => $category, 'client_label' => $client,
                'description' => 'Réalisation de démonstration — à remplacer par vos photos depuis le back-office.',
                'image_url' => '/visuals/'.$visual.'.svg', 'ratio' => $ratio, 'year' => $year,
                'is_published' => true, 'sort_order' => $i,
            ]);
        }
    }
}
