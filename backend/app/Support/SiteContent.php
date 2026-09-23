<?php

namespace App\Support;

use App\Models\Setting;

/**
 * Textes du site modifiables depuis le back-office (« Contenus du site »).
 * Stockés dans `settings` sous la clé `content.<clé>` ; les valeurs par défaut s'appliquent tant
 * que rien n'a été saisi. Ajouter un texte = ajouter une entrée ici et l'utiliser côté frontend.
 */
final class SiteContent
{
    /** @var array<string, array{label: string, section: string, default: string|list<array{q: string, a: string}>, multiline?: bool}> */
    public const FIELDS = [
        'hero.eyebrow' => ['section' => 'Accueil — bandeau principal', 'label' => 'Surtitre', 'default' => "Atelier de gravure & d'impression — Abidjan"],
        'hero.title_1' => ['section' => 'Accueil — bandeau principal', 'label' => 'Titre — ligne 1', 'default' => 'Nous donnons'],
        'hero.title_2' => ['section' => 'Accueil — bandeau principal', 'label' => 'Titre — ligne 2', 'default' => 'une forme'],
        'hero.title_3' => ['section' => 'Accueil — bandeau principal', 'label' => 'Titre — ligne 3 (dorée)', 'default' => 'à vos récompenses.'],
        'hero.subtitle' => ['section' => 'Accueil — bandeau principal', 'label' => 'Sous-titre', 'default' => 'Trophées, gravure, impression et personnalisation sur tous supports.'],
        'hero.cta_primary' => ['section' => 'Accueil — bandeau principal', 'label' => 'Bouton principal', 'default' => 'Créer mon projet'],
        'hero.cta_secondary' => ['section' => 'Accueil — bandeau principal', 'label' => 'Bouton secondaire', 'default' => 'Découvrir nos réalisations'],
        'home.services_title' => ['section' => 'Accueil — sections', 'label' => 'Titre « Savoir-faire »', 'default' => "Tout ce qui se grave, s'imprime et se remet."],
        'home.signature_title' => ['section' => 'Accueil — sections', 'label' => 'Titre « Donnez vie à votre idée »', 'default' => 'Votre projet prend forme sous vos yeux.'],
        'home.signature_body' => ['section' => 'Accueil — sections', 'label' => 'Texte « Donnez vie à votre idée »', 'multiline' => true, 'default' => 'Choisissez ce que vous voulez créer. Le studio vous guide étape par étape, vous montre le rendu et calcule une estimation — sans engagement.'],
        'home.portfolio_title' => ['section' => 'Accueil — sections', 'label' => 'Titre « Réalisations »', 'default' => 'La précision se voit de près.'],
        'home.cta_title' => ['section' => 'Accueil — sections', 'label' => 'Titre de l\'appel final', 'default' => 'Parlez-nous de votre prochaine récompense.'],
        'footer.about' => ['section' => 'Pied de page & contact', 'label' => 'Présentation (pied de page)', 'multiline' => true, 'default' => "Trophées, médailles, gravure, impression et objets personnalisés. Conçus et fabriqués dans notre atelier d'Abidjan, livrés dans toute la Côte d'Ivoire."],
        'contact.intro' => ['section' => 'Pied de page & contact', 'label' => 'Introduction de la page Contact', 'multiline' => true, 'default' => 'Une question, un délai serré, un besoin particulier ? Écrivez-nous. Pour un chiffrage, le studio ou la demande de devis sont les plus rapides.'],
        'faq' => ['section' => 'Questions fréquentes', 'label' => 'Questions / réponses', 'default' => [
            ['q' => 'Quel est le délai de fabrication ?', 'a' => "Il dépend du produit et de la quantité : chaque fiche indique un délai estimatif, et l'option express réduit ce délai de moitié lorsque c'est possible. Le délai définitif figure sur votre devis."],
            ['q' => 'Puis-je voir mon trophée avant la fabrication ?', 'a' => 'Oui. Le configurateur 3D vous montre le rendu en direct, puis notre équipe vous envoie un BAT (bon à tirer) à valider avant toute production.'],
            ['q' => 'Quels fichiers dois-je envoyer pour mon logo ?', 'a' => 'Idéalement un fichier vectoriel (SVG, PDF, AI ou EPS). Un PNG ou JPG en bonne résolution convient aussi : nous vous prévenons si une vectorisation est nécessaire.'],
            ['q' => "L'estimation en ligne est-elle un prix définitif ?", 'a' => "Non. C'est une estimation calculée à partir de nos tarifs. Le prix définitif figure sur le devis validé par notre équipe, qui tient compte de tous les détails de votre projet."],
            ['q' => "Livrez-vous en dehors d'Abidjan ?", 'a' => "Oui, dans toute la Côte d'Ivoire. Le retrait à l'atelier reste possible pour toutes les commandes."],
        ]],
    ];

    /** Coordonnées publiques (saisies dans Paramètres → Entreprise). */
    public const PUBLIC_COMPANY = ['company.address', 'company.phone', 'company.email', 'company.whatsapp', 'company.opening_hours'];

    /** @return array<string, mixed> contenu effectif (valeur saisie ou défaut) */
    public static function all(): array
    {
        $saved = Setting::query()->where('group', 'content')->pluck('value', 'key');
        $content = [];
        foreach (self::FIELDS as $key => $field) {
            $value = $saved['content.'.$key] ?? null;
            $content[$key] = ($value === null || $value === '' || $value === []) ? $field['default'] : $value;
        }
        foreach (self::PUBLIC_COMPANY as $key) {
            $content[$key] = Setting::get($key);
        }

        return $content;
    }

    /** @param array<string, mixed> $values */
    public static function save(array $values): void
    {
        foreach ($values as $key => $value) {
            if (! isset(self::FIELDS[$key])) {
                continue;
            }
            if ($key === 'faq') {
                $value = collect(is_array($value) ? $value : [])
                    ->map(fn ($i) => ['q' => strip_tags(trim((string) ($i['q'] ?? ''))), 'a' => strip_tags(trim((string) ($i['a'] ?? '')))])
                    ->filter(fn ($i) => $i['q'] !== '' && $i['a'] !== '')
                    ->values()->all();
            } else {
                $value = strip_tags(trim((string) $value));
            }
            Setting::put('content.'.$key, $value, 'content');
        }
    }
}
