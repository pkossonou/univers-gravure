# UNIVERS GRAVURE — notes projet

Monorepo : `backend/` (Laravel 13, API `/api/v1`, MySQL 8) et `frontend/` (Next.js 16 App Router). Voir `README.md`
et `docs/ARCHITECTURE.md` (décisions D1–D12).

## Règles à respecter

- Aucune donnée métier en dur dans le frontend : tout passe par l'API (MySQL).
- Les prix ne sont calculés que côté serveur (`App\Services\PricingService`) et jamais présentés comme définitifs.
- Finances : ne jamais appeler « bénéfice net » le résultat calculé (`App\Services\FinanceService`).
- Chaque action back-office vérifie une permission `module.action` (`App\Support\Permissions`) ; le client ne voit que
  ses données (`ClientAreaController`, 404 sinon).
- Textes d'interface en français ; montants en FCFA entiers.

## Vérifications

- Backend : `php artisan test` (base `univers_gravure_test`), `./vendor/bin/pint`.
- Frontend : `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (l'API doit tourner pour le build).
- Next 16 : `params`/`searchParams` asynchrones, `proxy` remplace `middleware` ; lire `node_modules/next/dist/docs` en cas de doute.
- Le cache Laravel n'accepte pas d'objets sérialisés (`cache.serializable_classes = false`) : ne mettre en cache que des tableaux.
- Palette des graphiques validée (skill dataviz) : CA `#b07d1a`, dépenses `#3060c8`, résultat `#15906a`.
