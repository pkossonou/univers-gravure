# UNIVERS GRAVURE — Plateforme digitale

Site vitrine premium, catalogue, configurateur 3D, devis en ligne (recontact WhatsApp, sans compte client) et back-office complet
(CRM, commandes, production, stock, achats, dépenses, analyse financière, rapports, QR codes, certificats).

| Dossier | Contenu |
|---|---|
| `backend/` | API REST Laravel 13 (PHP 8.3), Sanctum, MySQL 8 |
| `frontend/` | Next.js 16 (App Router, TypeScript, Tailwind v4, Framer Motion, React Three Fiber) |
| `docs/` | [Architecture & UX/UI](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Base de données](docs/DATABASE.md) · [Mise en production](docs/DEPLOIEMENT.md) · [Guide du back-office](docs/GUIDE-ADMIN.md) |

---

## Prérequis

- PHP ≥ 8.3 avec les extensions `pdo_mysql`, `mbstring`, `intl`, `gd`, `zip`, `fileinfo`
- Composer 2
- MySQL 8 (ou MariaDB 10.6+)
- Node.js ≥ 20 (testé avec Node 24) et npm

## Démarrage rapide (développement)

### 1. Base de données

```sql
CREATE DATABASE univers_gravure CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE univers_gravure_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; -- pour les tests
```

### 2. Backend (API) — http://localhost:8000

```bash
cd backend
composer install
cp .env.example .env          # ajuster DB_* si besoin
php artisan key:generate
php artisan migrate --seed    # schéma + référentiel + 12 mois de données de démonstration
php artisan storage:link
composer serve        # serveur de dev avec limites d’envoi relevées (64 Mo)
```

Le seed importe aussi automatiquement les photos du dossier `image/` dans les réalisations.
Pour une base sans données de démonstration : `php artisan db:seed --class=ProductionSeeder` (voir plus bas).

### 3. Frontend — http://localhost:3000

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Comptes de démonstration

Mot de passe commun : `Gravure2026!` (variable `SEED_DEMO_PASSWORD`).

| Rôle | E-mail |
|---|---|
| Super administrateur | direction@universgravure.example |
| Administrateur | admin@universgravure.example |
| Commercial | commercial@universgravure.example |
| Comptabilité | compta@universgravure.example |
| Production | atelier@universgravure.example |
| Designer | design@universgravure.example |

Toutes les données de démonstration sont fictives (noms inventés, domaines réservés `.example`).
Les visuels des produits de démonstration sont des rendus vectoriels génériques (`frontend/public/visuals`) à remplacer
par les photos réelles depuis **Back-office → Produits**. Gérer les photos, vidéos et textes du site :
[guide du back-office](docs/GUIDE-ADMIN.md).

---

## Commandes utiles

| Commande | Rôle |
|---|---|
| `php artisan migrate:fresh --seed` | Réinitialise la base avec la démo |
| `php artisan db:seed --class=ProductionSeeder` | Rôles, référentiel, règles tarifaires et un super-admin (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) |
| `php artisan realisations:import ../image` | Importe les photos / vidéos d’un dossier dans les réalisations |
| `php artisan test` | Tests backend (base `univers_gravure_test`) |
| `./vendor/bin/pint` | Formatage PHP |
| `npm run dev` / `npm run build` / `npm start` | Frontend |
| `npm test` | Tests frontend (Vitest + Testing Library) |
| `npm run typecheck` / `npm run lint` | Vérifications TypeScript / ESLint |
| `npm run visuals` | Régénère les visuels vectoriels de démonstration |

## Ce que couvre la plateforme

**Public** : accueil avec intro animée et trophée 3D interactif · catalogue filtrable (catégorie, matériau,
personnalisation, usage, événement, prix, dimensions) et recherche instantanée · fiches produits SEO avec estimation
· **Studio « Créer mon projet »** · **configurateur 3D en 10 étapes** avec gravure du texte et du logo en direct ·
calculateur d'estimation · demande de devis en 8 étapes avec envoi de fichiers · scan d'objet (MVP) ·
réalisations (masonry, lightbox, avant/après) · suivi de demande · pages publiques des trophées connectés (QR) et
vérification des certificats.

**Pas de compte client** : le client laisse son numéro WhatsApp (obligatoire, e-mail facultatif) ; l'équipe le recontacte,
lui envoie le devis PDF sur WhatsApp et enregistre son accord ou son refus dans le back-office (boutons « WhatsApp »,
« Accord client → commande », « Refusé »). Le client peut suivre sa demande sur `/suivi` avec son numéro DEM-… et son
numéro WhatsApp. La connexion (`/connexion`) est réservée à l'équipe.

**Back-office** : tableau de bord, analyse financière multi-périodes, rapports PDF/CSV, clients, prospects,
demandes, devis, commandes, production (tableau d'atelier), produits, catégories/matériaux/finitions/réalisations,
stock et mouvements, fournisseurs et achats, factures et paiements, dépenses avec justificatifs, revenus,
QR codes, certificats, utilisateurs et rôles, règles tarifaires, paramètres, journal d'activité, notifications,
recherche globale (Ctrl K).

## Principes

- **Aucune donnée inventée côté interface** : tout vient de MySQL via l'API.
- **Prix** : calculés uniquement côté serveur par des règles configurables ; jamais présentés comme définitifs
  (« Estimation indicative », « À partir de… » ou « Votre demande nécessite une validation par notre équipe »).
- **Finances** : chiffre d'affaires, coûts directs, marge brute estimée et *résultat calculé sur les données saisies*
  sont distingués ; un avertissement apparaît si des charges récurrentes manquent sur la période.
- **Sécurité** : jetons Sanctum, permissions par action, validation serveur, contrôle MIME réel des fichiers, fichiers
  clients privés servis par URL signée, limitation de débit, journal d'audit.
