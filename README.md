# CinéClub

Un petit site privé pour lister et suivre votre collection de films (DVD + disque dur) :
accueil avec toute la collection, page DVD, page disque dur, fiche détaillée par film
(durée, type, genres, plateforme, bande-annonce), comptes utilisateurs, "vu" + note sur 10,
page de profil avec statistiques, et ajout de films par n'importe quel membre connecté.

Prévu pour un petit groupe (~7 personnes), pas pour du grand public.

## Structure

```
cineclub/
  public/               → le site (HTML/CSS/JS, aucun outil de build nécessaire)
  netlify/functions/    → l'API, sous forme de fonction Netlify (Express + Turso)
  scripts/seed-turso.js → script à lancer UNE FOIS pour créer les tables et importer les films
  data/movies_seed.json → les 681 films fournis (DVD + disque dur)
  netlify.toml          → configuration du déploiement Netlify

  server/               → ancienne version "tout-en-un" (Node/Express + SQLite en fichier local)
                           gardée pour tester rapidement en local ou pour un déploiement
                           sur Render/Railway à la place de Netlify (voir plus bas).
```

## ⚠️ Pourquoi Netlify a besoin d'une base de données à part

Netlify héberge très bien les fichiers du site (`public/`) et peut exécuter du code ponctuel
(`netlify/functions/`), mais ne fait pas tourner de serveur en continu et ne garde pas de
fichier de base de données entre deux requêtes. On utilise donc **Turso**, une base de
données en ligne gratuite, compatible SQLite (donc très proche de ce qu'on utilisait avant).

## Publier sur Netlify — étapes complètes

### 1. Créer la base de données Turso (gratuite)

1. Allez sur https://turso.tech et créez un compte gratuit (le plan gratuit suffit largement
   pour 7 utilisateurs).
2. Une fois connecté, créez une base de données (bouton "Create Database" sur le tableau de
   bord, ou via leur CLI si vous préférez).
3. Récupérez deux informations depuis le tableau de bord de votre base :
   - l'**URL de connexion** (commence par `libsql://...`)
   - un **jeton d'authentification** (bouton "Create Token" ou "Generate Token")

### 2. Importer vos 681 films dans Turso (une seule fois, en local)

Sur votre ordinateur, avec Node.js installé :

```bash
cd scripts
npm install
TURSO_DATABASE_URL="libsql://votre-base.turso.io" TURSO_AUTH_TOKEN="votre-jeton" node seed-turso.js
```

Ça crée les tables et importe les 681 films. Vous ne referez cette étape qu'une fois
(le script refuse de réimporter si des films sont déjà présents).

### 3. Mettre le projet sur GitHub

Comme précédemment : créez un dépôt sur github.com et envoyez-y tout le contenu du dossier
`cineclub` (glisser-déposer les fichiers via l'interface web de GitHub fonctionne très bien).

### 4. Créer le site sur Netlify

1. Sur https://app.netlify.com : **Add new site** → **Import an existing project** →
   connectez votre dépôt GitHub `cineclub`.
2. Netlify détecte automatiquement `netlify.toml` (dossier public = `public`, fonctions =
   `netlify/functions`) — vous n'avez normalement rien à changer dans les réglages de build.
3. Avant de déployer, allez dans **Site configuration → Environment variables** et ajoutez :
   - `TURSO_DATABASE_URL` : la même URL qu'à l'étape 1
   - `TURSO_AUTH_TOKEN` : le même jeton qu'à l'étape 1
   - `JWT_SECRET` : une longue phrase secrète inventée (sécurise les connexions)
   - `REGISTER_CODE` : le code que vous donnerez à vos ~7 proches pour créer un compte
     (changez-le, ne gardez pas la valeur par défaut)
4. Cliquez sur **Deploy site**. Après une ou deux minutes, Netlify vous donne un lien du type
   `https://nom-au-hasard.netlify.app` — c'est le lien à partager. Vous pouvez le renommer
   (plus lisible) dans **Site configuration → Change site name**.

C'est tout : la fonction se charge d'installer ses propres dépendances (`@libsql/client`,
`express`, etc. listées dans `netlify/functions/package.json`) automatiquement au déploiement.

### Tester en local avant de publier (optionnel)

Avec la CLI Netlify (`npm install -g netlify-cli`), depuis la racine du projet :

```bash
netlify dev
```

en ayant au préalable créé un fichier `.env` à la racine avec `TURSO_DATABASE_URL`,
`TURSO_AUTH_TOKEN`, `JWT_SECRET`, `REGISTER_CODE`, et `COOKIE_SECURE=false` (uniquement pour
ce mode local, à ne pas mettre sur Netlify).

## Alternative : lancer la version "tout-en-un" en local (dossier `server/`)

Pratique pour bidouiller vite fait sans toucher à Turso :

```bash
cd server
npm install
npm start
```

Puis ouvrez http://localhost:3000 — les films sont importés automatiquement dans un fichier
SQLite local au premier lancement. Cette version peut aussi être publiée sur Render ou
Railway si vous changez d'avis sur Netlify (voir les instructions données précédemment).

## Créer un compte

Pour garder le site privé, la création de compte demande un "code d'invitation".
Par défaut c'est `cineclub2026` — **changez-le** via la variable d'environnement
`REGISTER_CODE` (voir plus bas), et donnez le nouveau code seulement aux ~7 personnes
concernées.

## Déployer le dossier `server/` à la place de Netlify (Render / Railway)

Ces options utilisent la version "tout-en-un" (`server/`) avec sa propre base SQLite en
fichier — pas besoin de Turso dans ce cas, mais pas compatible avec Netlify.

### Option A — Render (recommandé pour cette version, gratuit)

1. Créez un compte sur https://render.com et un dépôt Git (GitHub, GitLab…) avec ce projet.
   (Sur github.com : "New repository", puis suivez les instructions pour pousser ce dossier.)
2. Sur Render : **New +** → **Web Service** → connectez votre dépôt.
3. Configurez :
   - **Root Directory** : `server`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : Free
4. Dans l'onglet **Environment**, ajoutez ces variables :
   - `JWT_SECRET` : une longue phrase secrète aléatoire (obligatoire, sert à sécuriser les connexions)
   - `REGISTER_CODE` : le code d'invitation que vous donnerez à vos proches
5. **Important pour ne pas perdre les données** : dans l'onglet **Disks**, ajoutez un disque
   persistant (1 Go suffit largement), monté sur `/opt/render/project/src/data`, et ajoutez
   la variable d'environnement `DB_PATH=/opt/render/project/src/data/cineclub.db`.
   Sans ça, la base (les comptes, les "vus", les notes) est effacée à chaque redéploiement.
6. Cliquez sur **Create Web Service**. Au bout de quelques minutes, Render vous donne un lien
   du type `https://cineclub-xxxx.onrender.com` — c'est le lien à partager.

Note sur le plan gratuit de Render : le service "s'endort" après 15 minutes sans visite, et met
~30 secondes à se réveiller au prochain visiteur. Pour un usage entre amis c'est généralement
acceptable ; sinon un plan payant à quelques dollars/mois supprime ce délai.

### Option B — Railway.app

Fonctionne aussi très bien et est légèrement plus simple pour le disque persistant :
1. https://railway.app → **New Project** → **Deploy from GitHub repo**.
2. Réglez le **Root Directory** sur `server`, la commande de démarrage `npm start`.
3. Ajoutez un **Volume** monté sur `/app/data`, avec `DB_PATH=/app/data/cineclub.db`.
4. Ajoutez les variables `JWT_SECRET` et `REGISTER_CODE`.
5. Railway génère un lien public `*.up.railway.app` (un petit crédit gratuit mensuel est offert,
   au-delà c'est payant à l'usage — généralement quelques centimes par mois pour ce site).

### Option C — Un petit VPS (si vous en avez déjà un)

Copiez le dossier `server/` et `public/` sur le serveur, `npm install`, puis lancez le
serveur derrière un gestionnaire de process comme `pm2` (`pm2 start index.js`) et un reverse
proxy Nginx si vous voulez un nom de domaine et du https.

## Variables d'environnement

**Pour Netlify (fonction dans `netlify/functions/`) :**

| Variable              | Rôle                                                          | Par défaut                  |
|-----------------------|----------------------------------------------------------------|------------------------------|
| `TURSO_DATABASE_URL`  | URL de votre base Turso                                        | *(obligatoire)*              |
| `TURSO_AUTH_TOKEN`    | Jeton d'authentification Turso                                 | *(obligatoire)*              |
| `JWT_SECRET`          | Clé secrète pour signer les connexions — **à changer**         | `change-moi-en-production-stp` |
| `REGISTER_CODE`       | Code demandé pour créer un compte                              | `cineclub2026`               |
| `COOKIE_SECURE`       | Mettre à `false` uniquement en local (`netlify dev`)           | `true`                       |

**Pour la version `server/` (Render / Railway / VPS) :**

| Variable         | Rôle                                                          | Par défaut                  |
|------------------|----------------------------------------------------------------|------------------------------|
| `PORT`           | Port d'écoute                                                  | `3000`                       |
| `JWT_SECRET`     | Clé secrète pour signer les connexions — **à changer en prod** | `change-moi-en-production-stp` |
| `REGISTER_CODE`  | Code demandé pour créer un compte                              | `cineclub2026`               |
| `DB_PATH`        | Emplacement du fichier de base SQLite                          | `server/data/cineclub.db`    |

## Pour continuer à développer le site (prochaines étapes possibles)

- Ajouter la possibilité de modifier/supprimer un film déjà en collection depuis la fiche.
- Uploader une image directement au lieu de coller un lien (nécessite un espace de stockage
  fichier persistant, ex. Cloudinary gratuit).
- Voir qui d'autre a vu / noté un film (actuellement seule la moyenne du groupe est affichée).
- Un mode "à voir plus tard" (liste d'envie) en plus de "vu".
