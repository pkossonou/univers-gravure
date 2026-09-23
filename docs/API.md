# API REST — UNIVERS GRAVURE (v1)

Base : `/api/v1` · JSON · spécification OpenAPI : [`backend/public/openapi.yaml`](../backend/public/openapi.yaml)
(consultable avec n'importe quel lecteur OpenAPI, ex. Swagger Editor).

## Authentification

Jeton **Sanctum** (Bearer). Obtenu par `POST /auth/login` ou `POST /auth/register`, envoyé ensuite :

```
Authorization: Bearer <token>
Accept: application/json
```

Durée de vie : `SANCTUM_TOKEN_EXPIRATION` minutes (7 jours par défaut). `POST /auth/logout` révoque le jeton ;
un changement de mot de passe révoque les autres sessions ; un compte désactivé perd l'accès immédiatement.

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/register` | Crée un compte client (rattache une fiche client existante au même e-mail) |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| POST | `/auth/logout` | Révoque le jeton courant |
| GET | `/auth/me` | Utilisateur, rôles, permissions, fiche client |
| PUT | `/auth/profile` | Nom, téléphone, entreprise, adresse |
| PUT | `/auth/password` | `current_password`, `password`, `password_confirmation` |

## Conventions de liste

`?search=` · `?filter[colonne]=a,b` (colonnes autorisées uniquement) · `?sort=-colonne` · `?page=` · `?per_page=` (≤ 100)
· `?date_from=&date_to=` sur les ressources datées.

```json
{ "data": [ ... ], "meta": { "current_page": 1, "last_page": 4, "per_page": 20, "total": 73 } }
```

## Erreurs

| Code | Corps | Cas |
|---|---|---|
| 401 | `{ "message": "Authentification requise." }` | jeton absent / expiré / compte désactivé |
| 403 | `{ "message": "Action non autorisée pour votre rôle." }` | permission manquante |
| 404 | `{ "message": "Ressource introuvable." }` | y compris ressource d'un autre client |
| 422 | `{ "message": "...", "errors": { "champ": ["..."] } }` | validation ou règle métier |
| 429 | `{ "message": "Too Many Attempts." }` | limitation de débit |

## Public

| Méthode | Route | Notes |
|---|---|---|
| GET | `/catalog/categories` · `/catalog/categories/{slug}` | |
| GET | `/catalog/products` | filtres : `category, material, finish, personalization, usage, event, availability, id` (slugs séparés par virgule), `price_min, price_max, height_min, height_max, featured, configurable, search, sort=popular\|newest\|price_asc\|price_desc\|name` |
| GET | `/catalog/products/{slug}` | fiche + produits liés (compte les vues) |
| GET | `/catalog/materials` · `/catalog/finishes` · `/catalog/filters` | facettes avec compteurs |
| GET | `/portfolio?category=` | réalisations |
| POST | `/pricing/estimate` | voir ci-dessous |
| POST | `/uploads` | multipart `file` (+ `kind`) → `{ token, name, size, mime_type }` ; 20 Mo ; PNG JPG WEBP SVG PDF AI EPS ; MIME réel vérifié ; SVG avec script refusé |
| DELETE | `/uploads/{token}` | retire un fichier non encore rattaché |
| POST | `/projects` | dépôt d'une demande (studio, configurateur, formulaire, scan) ; `file_tokens[]` rattache les fichiers ; `consent` requis ; champ pot de miel `website` |
| GET | `/projects/track/{number}?email=` | suivi public (numéro ET e-mail) |
| POST | `/contact` | crée un prospect |
| GET | `/trophies/{code}` | page publique d'un trophée connecté (compte les scans) |
| GET | `/certificates/{number}` · `/certificates/{number}/pdf` | vérification (empreinte SHA-256) |
| GET | `/files/{id}?signature=…` | fichier client via URL signée (30 min) |

### Estimation

```json
POST /pricing/estimate
{ "product_id": 1, "quantity": 20, "size": "M — 36 cm", "material_id": 1, "finish_id": 1,
  "personalizations": ["gravure"], "has_logo": true, "urgency": "standard" }
```

```json
{ "data": {
  "confidence": "firm | from | needs_review",
  "estimate_min": 1234500, "estimate_max": 1234500, "currency": "XOF",
  "label": "Estimation indicative",
  "disclaimer": "Estimation non contractuelle…",
  "breakdown": [{ "label": "Coupe Prestige — M", "amount": 1215000 }, …],
  "reasons": [], "lead_time_days": { "min": 3, "max": 7 } } }
```

`needs_review` : produit sur devis, projet non chiffrable, dimensions manquantes pour un prix au m², série > 500.

## Espace client — `/me` (authentifié, périmètre limité au client connecté)

`GET overview` · `GET projects`, `projects/{id}` · `GET quotes`, `quotes/{id}` (passe la demande « en attente de
validation ») · `POST quotes/{id}/accept` (crée la commande) · `POST quotes/{id}/reject` · `GET quotes/{id}/pdf` ·
`GET orders`, `orders/{id}` (frise + étapes visibles client) · `GET invoices`, `invoices/{id}/pdf` · `GET files`.

## Notifications (tout utilisateur connecté)

`GET /notifications` (`meta.unread`) · `POST /notifications/{id}/read` · `POST /notifications/read-all`.

## Back-office — `/admin` (compte équipe + permission `module.action`)

| Domaine | Routes |
|---|---|
| Pilotage | `GET dashboard?period=`, `GET finance?period=&from=&to=`, `GET reports`, `GET reports/{financial\|sales\|clients\|expenses\|production}?period=&format=json\|csv\|pdf` |
| Système | `GET lookups`, `GET search?q=`, `GET/PUT settings`, `GET activity`, `GET roles`, CRUD `users` |
| CRM | CRUD `clients` (+ `POST clients/{id}/restore`), CRUD `leads` (+ `POST leads/{id}/convert`) |
| Catalogue | CRUD `products` (+ `POST products/{id}/images`, `DELETE products/{id}/images/{image}`), `categories`, `materials`, `finishes`, `tags`, `portfolio`, `pricing-rules` |
| Commercial | `GET/PUT projects`, `POST projects/{id}/draft-quote`, CRUD `quotes` + `send`, `accept`, `reject`, `pdf` |
| Atelier | `GET/PUT orders`, `POST orders/{id}/status`, `POST orders/{id}/invoice`, `GET production`, `PATCH production/{id}`, `PATCH production-steps/{id}` |
| Stock & achats | CRUD `stock-items`, `GET/POST stock-items/{id}/movements`, CRUD `suppliers`, `purchases` (+ `receive`, `cancel`) |
| Finances | CRUD `expenses` (+ `GET expenses/{id}/receipt`, multipart `receipt`), `expense-categories`, `revenues` ; `invoices` (+ `issue`, `cancel`, `payments`, `pdf`) |
| Objets connectés | CRUD `qr-codes` (+ `GET qr-codes/{id}/svg`), `certificates` (+ `revoke`, `pdf`) |

Périodes : `today`, `week`, `month`, `quarter`, `year`, `custom` (+ `from`, `to`).

## Limitation de débit

120 req/min (API), 6/min par e-mail+IP pour la connexion, 10/min et 60/jour par IP pour les formulaires publics,
20/min pour les envois de fichiers. Les IP du serveur Next.js (`TRUSTED_SSR_IPS`) ne sont pas limitées.
