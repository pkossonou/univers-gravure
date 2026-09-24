<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\ExpenseCategory;
use App\Models\Finish;
use App\Models\Material;
use App\Models\PricingRule;
use App\Models\Setting;
use App\Models\Tag;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Données de référence nécessaires en production (catégories, matériaux, finitions,
 * catégories de dépenses, règles tarifaires par défaut, paramètres société).
 */
class ReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['Trophées', 'trophees', 'La victoire mérite un objet à sa hauteur.', 'trophy', true],
            ['Médailles', 'medailles', 'Frappées, gravées, personnalisées.', 'medal', true],
            ['Plaques & distinctions', 'plaques', 'Honorer un parcours, marquer un lieu.', 'award', false],
            ['Gravure', 'gravure', 'Laser et mécanique, sur presque toutes les matières.', 'scan-line', true],
            ['Impression', 'impression', 'Grand format, UV, sublimation, haute définition.', 'printer', true],
            ['Signalétique', 'signaletique', 'Orienter, identifier, valoriser vos espaces.', 'signpost', true],
            ['Objets personnalisés', 'objets-personnalises', 'Votre marque sur les objets du quotidien.', 'package', true],
            ["Cadeaux d'entreprise", 'cadeaux-entreprise', 'Des attentions qui restent sur le bureau.', 'gift', true],
            ['Supports publicitaires', 'supports-publicitaires', 'Kakémonos, stands, bâches, PLV.', 'megaphone', true],
        ];
        foreach ($categories as $i => [$name, $slug, $tagline, $icon, $service]) {
            Category::updateOrCreate(['slug' => $slug], [
                'name' => $name, 'tagline' => $tagline, 'icon' => $icon, 'sort_order' => $i,
                'is_active' => true, 'show_in_services' => $service,
                'seo_title' => $name.' personnalisés à Abidjan | UNIVERS GRAVURE',
                'seo_description' => $tagline.' Fabrication et personnalisation à Abidjan, livraison en Côte d\'Ivoire.',
            ]);
        }

        $materials = [
            ['Laiton', '#C9A45C', 1.35, null], ['Aluminium brossé', '#B8BCC4', 1.0, null],
            ['Acier inoxydable', '#9EA3AB', 1.25, null], ['Plexiglas (acrylique)', '#DDE8F0', 0.9, null],
            ['Cristal optique', '#E9F1F7', 1.8, null], ['Verre', '#D5E3EA', 1.2, null],
            ['Bois noble (acajou)', '#6B3A22', 1.15, null], ['MDF', '#B08A5E', 0.8, null],
            ['Zamak doré', '#D4AF6A', 1.1, null], ['Bâche PVC 510 g', '#F2F2F2', 1.0, 6500],
            ['Vinyle adhésif', '#FAFAFA', 1.0, 9000], ['Dibond (aluminium composite)', '#E4E4E4', 1.0, 24000],
            ['Cuir', '#5A3A2A', 1.3, null],
        ];
        foreach ($materials as [$name, $hex, $mult, $m2]) {
            Material::updateOrCreate(['slug' => Str::slug($name)], [
                'name' => $name, 'color_hex' => $hex, 'price_multiplier' => $mult, 'price_per_m2' => $m2, 'is_active' => true,
            ]);
        }

        $finishes = [
            ['Or brillant', 1.10, 0], ['Argent satiné', 1.05, 0], ['Bronze antique', 1.05, 0],
            ['Noir mat', 1.0, 0], ['Effet miroir', 1.15, 0], ['Vernis sélectif', 1.0, 15000], ['Laqué couleur', 1.08, 10000],
        ];
        foreach ($finishes as [$name, $mult, $fee]) {
            Finish::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'price_multiplier' => $mult, 'flat_fee' => $fee, 'is_active' => true]);
        }

        $tags = [
            'usage' => ['Sport', 'Entreprise', 'Scolaire', 'Association', 'Institution', 'Particulier'],
            'event' => ['Tournoi de football', 'Gala & cérémonie', 'Séminaire', 'Remise de diplômes', 'Départ à la retraite', 'Salon & foire', 'Anniversaire', 'Mariage'],
        ];
        foreach ($tags as $type => $names) {
            foreach ($names as $name) {
                Tag::updateOrCreate(['slug' => Str::slug($name), 'type' => $type], ['name' => $name]);
            }
        }

        $expenseCategories = [
            ['Matières premières', '#D4AF6A', true, false], ['Sous-traitance', '#B08A5E', true, false],
            ['Transport & livraison', '#5B8DEF', true, false], ['Électricité', '#E0A43A', false, true],
            ['Internet & téléphone', '#7C6FD8', false, true], ['Salaires', '#4FB286', false, true],
            ['Loyer', '#8B8F98', false, true], ['Maintenance machines', '#E0594A', false, false],
            ['Marketing', '#D86FA8', false, false], ['Fournitures', '#6FB8D8', false, false], ['Autres', '#3A3A40', false, false],
        ];
        foreach ($expenseCategories as [$name, $color, $direct, $recurring]) {
            ExpenseCategory::updateOrCreate(['slug' => Str::slug($name)], [
                'name' => $name, 'color' => $color, 'is_direct_cost' => $direct, 'is_recurring' => $recurring, 'is_active' => true,
            ]);
        }

        if (PricingRule::count() === 0) {
            $rules = [
                // Prix de départ par type de projet sans produit précis
                ['Trophée sur mesure (base)', 'category_base', ['project_type' => 'trophee'], 25000, 'fixed'],
                ['Médaille personnalisée (base)', 'category_base', ['project_type' => 'medaille'], 2500, 'fixed'],
                ['Plaque gravée (base)', 'category_base', ['project_type' => 'plaque'], 15000, 'fixed'],
                ['Gravure sur objet (base)', 'category_base', ['project_type' => 'gravure'], 5000, 'fixed'],
                ['Objet personnalisé (base)', 'category_base', ['project_type' => 'objet'], 4000, 'fixed'],
                ["Cadeau d'entreprise (base)", 'category_base', ['project_type' => 'cadeau'], 8000, 'fixed'],
                ['Impression (au m²)', 'category_base', ['project_type' => 'impression', 'per' => 'm2'], 9000, 'fixed'],
                ['Signalétique (au m²)', 'category_base', ['project_type' => 'signaletique', 'per' => 'm2'], 24000, 'fixed'],
                // Dégressif quantité
                ['Remise série 10 à 49 ex.', 'quantity_tier', ['min_qty' => 10, 'max_qty' => 49], 5, 'percent'],
                ['Remise série 50 à 199 ex.', 'quantity_tier', ['min_qty' => 50, 'max_qty' => 199], 10, 'percent'],
                ['Remise série 200 ex. et +', 'quantity_tier', ['min_qty' => 200], 15, 'percent'],
                // Personnalisation (par unité)
                ['Gravure laser', 'personalization', ['personalization' => 'gravure'], 2000, 'per_unit'],
                ['Impression couleur', 'personalization', ['personalization' => 'impression'], 1500, 'per_unit'],
                ['Impression UV', 'personalization', ['personalization' => 'uv'], 2500, 'per_unit'],
                ['Sublimation', 'personalization', ['personalization' => 'sublimation'], 1800, 'per_unit'],
                ['Marquage', 'personalization', ['personalization' => 'marquage'], 1000, 'per_unit'],
                // Frais fixes
                ['Préparation du fichier logo', 'setup', ['when' => 'logo'], 10000, 'fixed'],
                // Délais
                ['Majoration express (délai réduit de moitié)', 'urgency', ['urgency' => 'express'], 30, 'percent'],
                ['Remise délai flexible', 'urgency', ['urgency' => 'flexible'], -5, 'percent'],
            ];
            foreach ($rules as $i => [$name, $type, $conditions, $amount, $amountType]) {
                PricingRule::create([
                    'name' => $name, 'type' => $type, 'conditions' => $conditions, 'amount' => $amount,
                    'amount_type' => $amountType, 'priority' => 100 - $i, 'is_active' => true,
                ]);
            }
        }

        $settings = [
            'company.address' => 'Treichville, Rue 11 avenue 18 — Abidjan, Côte d\'Ivoire',
            'company.phone' => '+225 05 00 10 50 96 / +225 07 07 06 71 88',
            'company.email' => 'contact@universgravure.com',
            'company.whatsapp' => '+225 05 00 10 50 96',
            'company.rccm' => 'RCCM à compléter',
            'company.opening_hours' => 'Lun – Sam · 8h00 – 18h30',
            'quotes.validity_days' => 30,
            'quotes.default_tax_rate' => 0,
            'quotes.default_terms' => "Acompte de 50 % à la validation. Solde à la livraison.\nDélais indicatifs à compter de la validation du BAT.",
        ];
        foreach ($settings as $key => $value) {
            if (! Setting::where('key', $key)->exists()) {
                Setting::put($key, $value, explode('.', $key)[0]);
            }
        }
    }
}
