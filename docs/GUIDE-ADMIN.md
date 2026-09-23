# Guide du back-office — gérer le contenu du site

Connexion : `https://votre-site/connexion` avec un compte de l'équipe → le back-office s'ouvre sur `/admin`.

## Ajouter, modifier, supprimer des photos et vidéos de réalisations

**Menu : Site web → Réalisations (photos, vidéos)**

| Action | Comment faire |
|---|---|
| Ajouter | Bouton **« Nouveau — réalisation »** → titre, catégorie, **Photo** (JPG, PNG, WEBP, 10 Mo max) et/ou **Vidéo** (MP4, WEBM, MOV, 60 Mo max) → **Enregistrer** |
| Remplacer une photo | Cliquer sur la ligne → choisir un nouveau fichier → **Enregistrer** (l'ancienne photo est effacée) |
| Masquer sans supprimer | Décocher **« Publiée »** |
| Supprimer | Bouton **Supprimer** sur la ligne → confirmer (la photo/vidéo est effacée du serveur) |
| Avant / après | Ajouter une **Photo « avant »** : un curseur de comparaison apparaît dans la galerie |
| Ordre d'affichage | Champ **Ordre** (petit nombre = affiché en premier) |

Les réalisations apparaissent sur la page **Réalisations** et dans la section « Réalisations » de l'accueil.

### Importer beaucoup de photos d'un coup (dossier)

1. Déposer les photos / vidéos dans le dossier `image/` du projet.
2. (Facultatif) décrire chaque fichier dans `image/realisations.json` : titre, catégorie, client, année,
   description, `"cover": true` pour en faire l'image d'une catégorie du catalogue.
3. Lancer : `cd backend && php artisan realisations:import ../image`
   (relançable sans créer de doublons ; les fichiers dont le nom contient « logo » sont ignorés).

## Modifier les textes du site

**Menu : Site web → Contenus du site**

Titre et sous-titre de l'accueil, boutons, titres des sections, présentation du pied de page,
introduction de la page Contact, questions fréquentes (ajouter, modifier, monter, supprimer).
Cliquer **Enregistrer** : le site est à jour en moins d'une minute.

Coordonnées (adresse, téléphone, WhatsApp, e-mail, horaires, RCCM) : **Système → Paramètres → Entreprise**
(elles apparaissent aussi sur les devis et factures PDF).

## Produits du catalogue et leurs photos

**Menu : Atelier → Produits** → cliquer sur un produit :
- textes, prix, délais, tailles, matières, SEO → **Enregistrer** ;
- bloc **Visuels** (à droite) : choisir une image + écrire un **texte alternatif** (description de la photo,
  obligatoire pour l'accessibilité et le référencement) → **Ajouter l'image** ; survoler une image puis **×** pour la supprimer.

Image d'une catégorie (cartes « Savoir-faire » de l'accueil) : **Atelier → Catégories & matières** → cliquer sur la catégorie → **Image de la catégorie**.

## Qui peut faire quoi

| Rôle | Réalisations, produits, catégories | Textes du site |
|---|---|---|
| Super administrateur, Administrateur | oui | oui |
| Designer | oui | non |
| Commercial, Comptabilité, Production | consultation | non |

Les rôles se gèrent dans **Système → Utilisateurs**.
