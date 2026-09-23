# Base de données — MySQL 8

Migrations : `backend/database/migrations`. Montants en **FCFA entiers** (`BIGINT UNSIGNED`), dates métier en `DATE`.
Statuts en `VARCHAR` indexé (listes de valeurs dans les modèles et `App\Support\Labels`). Suppression douce
(`deleted_at`) sur les entités à historique : utilisateurs, clients, prospects, produits, demandes, devis, commandes,
factures, dépenses, recettes, fournisseurs.

## Chaîne métier

```
clients ─┬─ projects (demande DEM-) ── project_files
         ├─ quotes (DEV-) ── quote_items
         ├─ orders (CMD-) ─┬─ order_items
         │                 ├─ order_status_histories   (frise, visibilité client)
         │                 ├─ production_orders (OF-) ── production_steps
         │                 ├─ invoices (FAC-) ── payments
         │                 ├─ expenses (coûts imputés)   └─ qr_codes ── digital_certificates (CERT-)
         └─ revenues (recettes hors facture)
```

## Tables

| Groupe | Tables | Points clés |
|---|---|---|
| Identité | `users`, `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`, `personal_access_tokens`, `password_reset_tokens`, `sessions` | rôles/permissions via spatie/laravel-permission |
| CRM | `clients`, `leads` | `clients.user_id` unique (compte client) ; index e-mail, téléphone, ville, type |
| Catalogue | `categories`, `products`, `product_variants`, `product_images`, `materials`, `finishes`, `tags`, `material_product`, `finish_product`, `product_tag`, `portfolio_items` | `products` : référence et slug uniques, index (statut, catégorie), prix, FULLTEXT (nom, accroche) ; JSON `dimensions`, `size_options`, `options`, `personalization_types` |
| Commercial | `projects`, `project_files`, `quotes`, `quote_items`, `pricing_rules` | `projects.personalization` / `configuration` en JSON ; estimation + niveau de confiance stockés ; `project_files.upload_token` pour les fichiers pas encore rattachés |
| Opérations | `orders`, `order_items`, `order_status_histories`, `production_orders`, `production_steps` | `cost_estimate` = somme des coûts de revient des lignes ; étapes `is_client_visible` |
| Stock & achats | `stock_items`, `stock_movements`, `suppliers`, `supplier_contacts`, `supplier_products`, `purchases`, `purchase_items` | mouvements signés avec quantité avant/après (traçabilité), coût moyen pondéré ; réception d'achat = entrées + dépense |
| Finances | `invoices`, `payments`, `revenues`, `expenses`, `expense_categories` | `expense_categories.is_direct_cost` (marge brute) et `is_recurring` (contrôle de complétude) ; index (catégorie, date) |
| Valeur ajoutée | `qr_codes`, `digital_certificates` | code QR unique ; `verification_hash` SHA-256 des données certifiées |
| Système | `notifications`, `reports`, `settings`, `activity_logs`, `cache`, `jobs` | `settings` contient aussi les compteurs de numérotation (`sequence.DEM.2026`) verrouillés en transaction |

## Règles de calcul financier (`App\Services\FinanceService`)

| Indicateur | Définition |
|---|---|
| Chiffre d'affaires | Σ `invoices.total` émises (statuts `issued`, `partially_paid`, `paid`) par `issued_at` + Σ `revenues.amount` par `revenue_date` |
| Encaissements | Σ `payments.amount` par `paid_at` + recettes hors facture |
| Coûts directs | Σ `expenses.amount` des catégories `is_direct_cost` |
| Marge brute estimée | CA − coûts directs |
| Résultat calculé | CA − toutes les dépenses saisies (**pas un bénéfice net**) ; `completeness.missing` liste les charges récurrentes non saisies par mois |
| Panier moyen | Σ `orders.total` / nombre de commandes non annulées (par `ordered_at`) |

Ces règles sont couvertes par `tests/Feature/FinanceCalculationTest.php` sur plusieurs périodes (jour, semaine, mois,
trimestre, année, personnalisée).

## Données de démonstration

`DatabaseSeeder` = `RolesAndPermissionsSeeder` + `ReferenceDataSeeder` + `CatalogSeeder` + `DemoSeeder`
(12 mois d'activité cohérente : ~200 demandes, devis, commandes, production, factures, paiements, dépenses mensuelles,
recettes comptoir, stock, fournisseurs, prospects, trophées connectés). Données fictives uniquement.
