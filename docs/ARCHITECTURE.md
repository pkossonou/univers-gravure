# UNIVERS GRAVURE — Architecture technique & UX/UI

> Document de référence. Toute décision structurante est consignée ici (section « Décisions »).

## 1. Analyse

UNIVERS GRAVURE (Abidjan, Côte d'Ivoire) vend des objets **sur mesure** : chaque commande part d'une
demande (trophée, médaille, plaque, gravure, impression, signalétique…) qui passe par un devis,
une validation, puis un cycle de production. Le produit numérique a donc trois faces :

| Face | Utilisateur | Objectif |
|---|---|---|
| **Vitrine + outils de projet** | Prospect / client | Comprendre l'offre en 5 s, configurer, estimer, envoyer un projet |
| **Client** | Visiteur (sans compte) | Déposer une demande, suivre avec son n° DEM + WhatsApp ; recontacté sur WhatsApp |
| **Back-office** | Équipe (6 rôles) | CRM, devis, commandes, production, stock, achats, finances, rapports |

Le **pivot métier** est la chaîne `Demande (quote_request) → Devis (quote) → Commande (order) → Ordre de production → Livraison → Facture/Paiements`.
Tous les écrans s'articulent autour de cette chaîne.

Devise : **FCFA (XOF)**, sans décimales. Langue : **français**. Fuseau : `Africa/Abidjan` (UTC+0).

## 2. Architecture globale

```
/frontend   Next.js 16 (App Router, TS, Tailwind v4, Framer Motion, R3F, TanStack Query, RHF + Zod, Recharts)
/backend    Laravel 13 / PHP 8.3 (API REST pure, Sanctum, spatie/permission, dompdf, MySQL 8)
/docs       Architecture, API, base de données, déploiement
```

```
Navigateur ──HTTPS──▶ Next.js (SSR/ISR pages publiques, SEO)
    │                        │  fetch serveur (catalogue, SEO, QR publics)
    │                        ▼
    └──── XHR (Bearer) ──▶ Laravel API /api/v1 ──▶ MySQL
                                   │──▶ storage (fichiers privés / publics)
                                   └──▶ queue (notifications, exports)
```

### Décisions

| # | Décision | Raison |
|---|---|---|
| D1 | **Sanctum en mode token (Bearer)** plutôt que cookie SPA | Front et API peuvent être sur des domaines différents (Vercel / VPS) ; pas de dépendance au partage de cookies. Token stocké côté client, expirations configurées, révocation au logout. |
| D2 | **spatie/laravel-permission** pour rôles & permissions | Standard éprouvé, tables `roles`/`permissions`, cache, Gates natives. Permissions granulaires `module.action`. |
| D3 | **Services** pour la logique métier (Pricing, Finance, Quote, Order, Stock, Numbering), **Form Requests** pour la validation, **API Resources** pour la sortie. Pas de Repository générique : Eloquent + scopes suffit ; les requêtes complexes (finance) sont dans un Service dédié. | Éviter l'abstraction creuse. |
| D4 | **Calculateur de prix côté serveur uniquement** (`PricingService`), règles en base (`pricing_rules`, prix matériaux/finitions). Le front affiche ce que l'API renvoie : `estimate_min`, `estimate_max`, `confidence` (`firm` / `from` / `needs_review`). | Jamais de prix « définitif » inventé. |
| D5 | **Finances** : le CA = factures émises (hors annulées) ; encaissements = paiements ; dépenses = `expenses`. La marge brute n'utilise que les coûts **directs** (catégories marquées `is_direct_cost`). Le « bénéfice » affiché est explicitement *« résultat calculé sur les données saisies »* + indicateur de complétude (catégories de charges sans saisie sur la période). | Exigence §24. |
| D6 | **Revenus** : table `revenues` pour les recettes hors facture (vente comptoir, prestation ponctuelle). CA total = factures + revenus manuels. | Couvre la réalité d'un atelier. |
| D7 | Fichiers clients stockés sur disque **privé** (`storage/app/private`), servis via URL signée temporaire. Validation extension + MIME réel + taille (20 Mo). Nom de fichier aléatoire. | Sécurité upload. |
| D8 | **3D procédurale** (géométries Three.js paramétriques : coupe, étoile, colonne, plaque, médaille) plutôt que des modèles GLB lourds. | Chargement < 150 ko, configurable en temps réel (forme/couleur/taille/texte). Fallback 2D SVG si WebGL indisponible. |
| D9 | Couche **AI** : interface `AiAssistant` (contrat) + implémentation `NullAiAssistant`. Aucun appel externe en V1. | Extensible sans coût. |
| D10 | **Notifications** : canal `database` en V1 + interface `Channel` prête pour mail / WhatsApp / SMS. | §30 |
| D11 | Numérotation métier : `DEM-2026-00012`, `DEV-…`, `CMD-…`, `FAC-…`, `OF-…`, `ACH-…`, `CERT-…` via `NumberingService` (table `settings` + verrou transactionnel). | Unicité garantie. |
| D12 | Tests backend sur base **MySQL de test** (`univers_gravure_test`) pour que les requêtes d'agrégation finance soient testées sur le vrai moteur. | Fidélité. |

## 3. Rôles & permissions

Permissions au format `module.action` (`view`, `create`, `update`, `delete`, `export`).

| Module | SUPER ADMIN | ADMIN | COMMERCIAL | COMPTABILITÉ | PRODUCTION | DESIGNER |
|---|---|---|---|---|---|---|
| dashboard (opérationnel) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| dashboard.finance (CA, bénéfice) | ✔ | ✔ | — | ✔ | — | — |
| clients / leads | ✔ | ✔ | ✔ | view | — | view |
| products / categories / materials | ✔ | ✔ | view | view | view | ✔ |
| quotes / quote_requests | ✔ | ✔ | ✔ | view | view | view |
| orders | ✔ | ✔ | ✔ | view | view/update | view |
| production | ✔ | ✔ | view | — | ✔ | ✔ |
| stock | ✔ | ✔ | view | view | ✔ | — |
| suppliers | ✔ | ✔ | — | ✔ | view | — |
| expenses / revenues / invoices / payments | ✔ | ✔ | — | ✔ | — | — |
| reports | ✔ | ✔ | sales | ✔ | production | — |
| qr_codes / certificates | ✔ | ✔ | ✔ | — | ✔ | ✔ |
| users / settings / pricing | ✔ | ✔ (sauf super admin) | — | — | — | — |

Le **client** est un utilisateur avec rôle `client`, lié à un enregistrement `clients` ; il n'accède qu'à `/api/v1/me/*` et ne voit que ses données (Policies) et les étapes de production marquées `is_client_visible`.

## 4. Base de données (MySQL 8)

Voir `docs/DATABASE.md` pour le détail des colonnes. Groupes :

- **Identité** : `users`, `roles`, `permissions`, `model_has_roles`, `role_has_permissions`, `personal_access_tokens`, `activity_logs`
- **CRM** : `clients` (soft delete), `leads`
- **Catalogue** : `categories`, `products` (soft delete), `product_variants`, `product_images`, `materials`, `finishes`, `material_product`, `finish_product`, `tags`, `product_tag`
- **Commercial** : `projects` (demande entrante / configuration), `project_files`, `quotes`, `quote_items`, `pricing_rules`
- **Opérations** : `orders`, `order_items`, `production_orders`, `production_steps`, `order_status_histories`
- **Stock / achats** : `suppliers`, `supplier_contacts`, `supplier_products`, `purchases`, `stock_items`, `stock_movements`
- **Finances** : `invoices`, `payments`, `revenues`, `expenses`, `expense_categories`
- **Valeur ajoutée** : `qr_codes`, `digital_certificates`
- **Système** : `notifications`, `reports`, `settings`, `jobs`, `cache`

Index : toutes les FK, `status`, dates métier (`issued_at`, `expense_date`, `paid_at`), `reference`/`number` uniques, `slug` uniques, FULLTEXT sur `products(name, description)`.

## 5. API REST — `/api/v1`

Conventions : JSON, `snake_case`, pagination `?page=&per_page=` (max 100), tri `?sort=-created_at`,
recherche `?search=`, filtres `?filter[status]=`. Erreurs : `{ message, errors? }` avec codes HTTP standard.

**Public (rate-limited)**
```
GET  /catalog/categories            GET /catalog/products            GET /catalog/products/{slug}
GET  /catalog/materials             GET /catalog/finishes            GET /catalog/filters
GET  /portfolio                     POST /pricing/estimate
POST /uploads                       (fichier temporaire → token)
POST /projects                      (demande de devis multi-étapes / configurateur / scan)
GET  /projects/track/{number}?email= (suivi public d'une demande)
POST /contact                       GET /trophies/{code}   GET /certificates/{number}
POST /auth/register  POST /auth/login  POST /auth/logout  GET /auth/me
```
**Espace client** : supprimé (septembre 2026) — les clients sont recontactés sur WhatsApp, l'équipe saisit leur accord.

**Back-office** `/admin/…` : ressources CRUD `clients, leads, categories, products, materials, finishes,
projects, quotes, orders, production-orders, stock-items, stock-movements, suppliers, purchases, expenses,
expense-categories, revenues, invoices, payments, qr-codes, certificates, users, pricing-rules, settings`,
plus `dashboard`, `finance/summary`, `finance/timeseries`, `finance/breakdown`, `reports/{type}` (csv/pdf),
`notifications`.

Documentation détaillée : `docs/API.md` + `backend/public/openapi.yaml`.

## 6. Direction UX/UI

### Concept : « L'atelier de précision »
La gravure, c'est un faisceau qui trace dans la matière. L'identité visuelle reprend trois éléments de l'atelier :
1. **Le faisceau** : une ligne lumineuse laiton qui balaie (intro, soulignements, états actifs, progress).
2. **Les repères de mesure** : graduations, croix de registration, cotes (« 240 mm »), références mono. Ils évoquent la précision sans surcharger.
3. **La matière** : noir graphite profond, laiton brossé, acier, papier ivoire. Reflets métalliques discrets.

### Palette (tokens)
| Token | Valeur | Usage |
|---|---|---|
| `ink-950` | `#0A0A0B` | fond principal public (sombre, écrin) |
| `ink-900` | `#111113` | surfaces |
| `ink-800` | `#1A1A1D` | cartes, bordures fortes |
| `ink-600` | `#3A3A40` | bordures |
| `steel-400` | `#8B8F98` | texte secondaire |
| `paper-50` | `#F5F2EB` | texte principal sur sombre, fond back-office clair |
| `brass-300` | `#E6CB8F` | reflets |
| `brass-400` | `#D4AF6A` | **accent principal** |
| `brass-600` | `#9C7A3C` | accent sur fond clair (contraste AA) |
| `success` `#4FB286` · `warning` `#E0A43A` · `danger` `#E0594A` · `info` `#5B8DEF` |

Le laiton est **rare** : CTA principal, faisceau, chiffres clés. Jamais en grand aplat.

### Typographie
- **Display** : *Fraunces* (serif à contraste, optical size) — titres, accroches, noms de produits. Évoque la gravure au burin.
- **Texte / UI** : *Manrope* — lisible, géométrique, moderne.
- **Précision** : *JetBrains Mono* — références, cotes, numéros de devis, montants dans les tableaux.

Échelle fluide (`clamp`) : display 56→112 px, h1 40→72, h2 32→48, h3 22→28, body 16/17, small 14, micro 12 (mono, tracking +8 %).

### Espacement & grille
Base 4 px. Sections publiques : `py-24 → py-40`. Grille 12 colonnes, gouttière 24 px, marges 16 px mobile / 40 px desktop, largeur max 1440 px.
Rayons : 2 px (précision) sur les éléments techniques, 16 px sur les cartes produits, 999 px sur les pilules.

### Mouvement
- Durées : micro 150 ms, UI 250 ms, révélation 600–900 ms. Courbe signature `cubic-bezier(0.22, 1, 0.36, 1)`.
- Intro : ≤ 1,8 s, passable (clic/touche), jouée une seule fois par session, désactivée si `prefers-reduced-motion`, `saveData` ou appareil faible (`hardwareConcurrency ≤ 4` sur mobile).
- 3D chargée en `dynamic import` quand le hero est visible, rendu à la demande (`frameloop="demand"` hors interaction), DPR plafonné à 1.75, fallback image/SVG.
- `prefers-reduced-motion` : aucun parallax, pas de rotation auto, fondus simples.

### Navigation
- **Public** : barre fine translucide (logo, Réalisations, Catalogue, Configurateur, Comment ça marche, Contact, CTA « Créer mon projet »). Mobile : barre basse fixe à 4 actions (Accueil, Catalogue, **Créer**, Compte) + menu plein écran.
- **Back-office** : thème **clair ivoire** (lisibilité longue durée) avec sidebar graphite. Sidebar groupée : Pilotage / Commercial / Atelier / Finances / Système. Recherche globale ⌘K.

### États
Chaque vue de données définit : *loading* (skeletons à la forme du contenu), *empty* (illustration trait + action primaire), *error* (message + réessayer), *success* (toast). Formulaires : validation inline Zod, messages en français, focus sur le premier champ en erreur.

### Accessibilité
Contraste AA minimum (texte principal ≥ 7:1 sur fond sombre), focus visible laiton 2 px, navigation clavier complète (configurateur inclus), `aria-live` pour l'estimation de prix, alt obligatoires (champ requis en back-office), labels explicites.

## 7. Composants (design system)

`Button` (primary / secondary / ghost / danger, tailles, loading), `MagneticButton`, `Card`, `ProductCard`, `ServiceCard`,
`ProductViewer` / `TrophyViewer3D` (+ fallback 2D), `Modal`, `Drawer`, `Input`, `Textarea`, `Select`, `DatePicker` (natif stylé),
`FileUploader` (drag & drop, progression), `Toast`, `Badge` / `StatusBadge`, `Tabs`, `Accordion`, `DataTable` (recherche, tri,
filtres, pagination, sélection, export, colonnes masquables), `StatCard`, `Chart` (Recharts), `Timeline`, `Navbar`, `Footer`,
`MobileMenu`, `MobileDock`, `ProjectStudio` (fonction signature « Créer mon projet »), `Stepper`, `EmptyState`, `Skeleton`, `BeamLine`, `Reveal`.

## 8. Plan d'implémentation

1. Backend : socle (Sanctum, CORS, rate limit, erreurs), migrations, modèles, seeders réalistes.
2. Backend : API publique (catalogue, estimation, uploads, projets, QR, certificats).
3. Backend : auth + espace client + back-office CRUD + finance + rapports + notifications.
4. Backend : tests (auth, clients, devis, commandes, dépenses, finance multi-périodes, permissions).
5. Frontend : tokens, polices, composants, layout public, intro.
6. Frontend : homepage (hero 3D, services, process, réalisations), catalogue, fiche produit.
7. Frontend : Studio « Créer mon projet » / configurateur 3D / personnalisation live / calculateur / upload / scan.
8. Frontend : espace client, back-office (dashboard, tables, finances, rapports).
9. SEO (metadata, sitemap, robots, JSON-LD), performance, accessibilité, tests front.
