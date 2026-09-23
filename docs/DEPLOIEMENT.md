# Mise en production

Architecture conseillée : **API Laravel** sur un VPS (Nginx + PHP-FPM 8.3 + MySQL 8) sous `api.votredomaine.ci`,
**frontend Next.js** sur le même VPS (Node 20+ derrière Nginx, géré par PM2/systemd) ou sur Vercel, sous `votredomaine.ci`.

## Backend

```bash
git clone … && cd backend
composer install --no-dev --optimize-autoloader
cp .env.example .env && php artisan key:generate
```

`.env` — valeurs à adapter impérativement :

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.votredomaine.ci
FRONTEND_URL=https://votredomaine.ci
CORS_ALLOWED_ORIGINS=https://votredomaine.ci
TRUSTED_SSR_IPS=<IP du serveur Next.js>
DB_DATABASE=univers_gravure  DB_USERNAME=…  DB_PASSWORD=…   # utilisateur MySQL dédié, pas root
SANCTUM_TOKEN_EXPIRATION=10080
CACHE_STORE=database          # ou redis
QUEUE_CONNECTION=database
NOTIFICATION_CHANNELS=database  # ajouter ",mail" une fois MAIL_* configuré
ADMIN_EMAIL=direction@votredomaine.ci
ADMIN_PASSWORD=<mot de passe fort, à changer à la 1re connexion>
```

```bash
php artisan migrate --force
php artisan db:seed --class=ProductionSeeder --force   # rôles, référentiel, règles tarifaires, super-admin
php artisan storage:link
php artisan config:cache && php artisan route:cache && php artisan view:cache
```

- Nginx : racine `backend/public`, `client_max_body_size 25M` (envois de 20 Mo), HTTPS obligatoire.
- Droits d'écriture PHP sur `storage/` et `bootstrap/cache/` uniquement.
- `storage/app/private` (fichiers clients, justificatifs) ne doit **jamais** être exposé : il est servi par URL signée.
- Worker de file : `php artisan queue:work --tries=3` (systemd) si des canaux mail/SMS sont activés.
- Sauvegardes : `mysqldump` quotidien + copie de `storage/app`.

## Frontend

```bash
cd frontend
npm ci
cp .env.example .env.production.local
#   NEXT_PUBLIC_SITE_URL=https://votredomaine.ci
#   NEXT_PUBLIC_API_URL=https://api.votredomaine.ci/api/v1
#   API_URL_INTERNAL=http://127.0.0.1:8000/api/v1   (si l'API est sur la même machine)
npm run build
npm start          # port 3000, derrière Nginx
```

Le build interroge l'API (pré-rendu des pages produits, sitemap) : l'API doit être accessible pendant `npm run build`.
Les pages publiques se revalident automatiquement (1 à 5 min) ; aucune redéploiement n'est nécessaire après une
modification du catalogue dans le back-office.

## Après la mise en ligne

1. Se connecter au back-office avec `ADMIN_EMAIL`, changer le mot de passe, créer les comptes de l'équipe.
2. **Paramètres → Entreprise** : adresse, téléphone, RCCM (utilisés dans les PDF).
3. **Paramètres → Règles tarifaires** : ajuster les prix de départ, remises, frais et majorations.
4. **Catégories & matières** puis **Produits** : saisir le catalogue réel avec photos (texte alternatif obligatoire).
5. **Paramètres → Catégories de dépenses** : marquer les coûts directs et les charges récurrentes.
6. Déclarer le sitemap (`/sitemap.xml`) dans Google Search Console.

## Tests avant chaque livraison

```bash
cd backend && php artisan test          # 59 tests (MySQL de test)
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
```
