# Mise en production

Hébergement : **Namecheap mutualisé (cPanel)**, compte `manoohpq`, même serveur que PECI.

| App | URL | Dossier serveur |
|---|---|---|
| API Laravel | `https://backend.universgravure.com` | `/home/manoohpq/universgravure.com/backend` |
| Frontend Next.js (Passenger) | `https://universgravure.com` | `/home/manoohpq/universgravure.com` |

Le sous-domaine `backend` vit **dans** le dossier du domaine principal : le frontend le protège (`protect_paths`).

## CI/CD

Déploiement par le kit [`xsel-deploy-mutualise`](https://github.com/ouangni-wangny/xsel-deploy-mutualise) :
`.github/workflows/cicd.yml` (jamais modifié) + `.xsel-deploy.yml` (propre au projet).

| Événement | Ce qui tourne |
|---|---|
| pull request | CI des apps modifiées (Pint + `php artisan test` sur MySQL ; lint + tests + build Next) |
| push sur `main` | CI, puis déploiement : backend, puis frontend |
| *Actions → CI/CD → Run workflow* | `deploy`, `doctor` (diagnostic, ne déploie rien) ou `provision` |
| toutes les 15 min | surveillance des deux URL et des certificats TLS |

Secrets du dépôt (posés par le propriétaire, `pkossonou`) : `DEPLOY_SSH_HOST`, `DEPLOY_SSH_PORT`, `DEPLOY_SSH_USER`,
`DEPLOY_SSH_PRIVATE_KEY`. Le kit appartenant à un autre compte GitHub, `cicd.yml` les transmet **explicitement**
(`secrets: inherit` ne passerait rien).

Variables du build frontend (`NEXT_PUBLIC_*`, figées au build) : dans `.xsel-deploy.yml`, pas dans cPanel.

## Première installation (une seule fois)

1. **cPanel → Setup Node.js App → Create Application** : Node `22` (comme `frontend/.nvmrc`), mode *Production*,
   application root `universgravure.com`, URL `universgravure.com`, startup file `server.js`.
2. **Actions → CI/CD → Run workflow**, `action: doctor` : vérifie SSH, PHP, extensions.
3. `action: provision`, `apps: backend` : crée la base MySQL `manoohpq_univers_gravure`, son utilisateur et le `.env`
   de production (`APP_KEY`, `APP_DEBUG=false`). Ne touche à rien si `.env` existe déjà.
4. Compléter `backend/.env` sur le serveur (le `.env` généré part de `.env.example`) :

   ```dotenv
   FRONTEND_URL=https://universgravure.com
   CORS_ALLOWED_ORIGINS=https://universgravure.com
   TRUSTED_SSR_IPS=127.0.0.1,162.213.251.104   # le SSR Next tourne sur le même serveur
   QUEUE_CONNECTION=sync                       # pas de worker de file sur l'hébergement mutualisé
   NOTIFICATION_CHANNELS=database              # ajouter ",mail" une fois MAIL_* configuré
   MAIL_FROM_ADDRESS=contact@universgravure.com
   ADMIN_EMAIL=direction@universgravure.com
   ADMIN_PASSWORD=<mot de passe fort, à changer à la 1re connexion>
   ```

5. Relancer `action: deploy` (ou pousser sur `main`) : migrations, `storage:link`, caches Laravel, redémarrage Next.
6. En SSH, une seule fois : `cd ~/universgravure.com/backend && php artisan db:seed --class=ProductionSeeder --force`
   (rôles, référentiel, règles tarifaires, super-admin), puis retirer `ADMIN_PASSWORD` du `.env`.
7. Sauvegarder le `.env` de production en secret GitHub `PROD_ENV_BACKUP` (copie de secours, lue par aucun workflow).

Chaque déploiement sauvegarde la base avant les migrations (`backend/.backups/db/`, 5 dumps). Pas de rollback
automatique : en cas de problème, annuler le commit fautif et pousser.

`storage/app/private` (fichiers clients, justificatifs) n'est jamais exposé : il est servi par URL signée.

Le build n'échoue pas si l'API est injoignable (pré-rendu et sitemap tolèrent l'absence de réponse) ; les pages
publiques se revalident ensuite toutes seules (1 à 5 min). Aucun redéploiement n'est nécessaire après une
modification du catalogue dans le back-office.

## Après la mise en ligne

1. Se connecter au back-office avec `ADMIN_EMAIL`, changer le mot de passe, créer les comptes de l'équipe.
2. **Paramètres → Entreprise** : adresse, téléphone, RCCM (utilisés dans les PDF).
3. **Paramètres → Règles tarifaires** : ajuster les prix de départ, remises, frais et majorations.
4. **Catégories & matières** puis **Produits** : saisir le catalogue réel avec photos (texte alternatif obligatoire).
5. **Paramètres → Catégories de dépenses** : marquer les coûts directs et les charges récurrentes.
6. Déclarer le sitemap (`/sitemap.xml`) dans Google Search Console.

## Tests avant chaque livraison

La CI les lance à chaque pull request et avant chaque déploiement ; en local :

```bash
cd backend && php artisan test && ./vendor/bin/pint --test
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
```
