# Carnet de rucher

Outil de suivi de ruches (Dadant 10, Dadant 8…), accessible depuis un ordinateur ou un téléphone.
Tout est hébergé sur Netlify : l'interface (Vite + React), l'API (une Netlify Function) et la base (Netlify Database, Postgres).

## Ce que fait cette première version

- Ruches : création, modification, statut (active, morte, fusionnée, vendue), suppression.
- Modèles de ruche : le nombre de cadres du corps pilote le formulaire de visite.
- Ruchers avec position GPS (bouton « Utiliser ma position », saisie manuelle, lien vers la carte).
- Reines : année, marquage (couleur proposée selon l'année), souche, historique des changements.
- Visites : cadres du corps (vide, bâti, couvain, miel, pollen), reine et œufs vus, cellules royales,
  hausses, comportement, actions, météo, notes. Les cadres sont repris de la visite précédente.

Le schéma de la base contient déjà les traitements, nourrissements et récoltes ; leurs écrans viennent ensuite.

## Démarrer en local

```bash
npm install
cp .env.example .env     # puis édite APP_PASSWORD et SESSION_SECRET
npm run dev
```

La base Postgres est créée automatiquement, et la migration `netlify/database/migrations/` est appliquée.
Si l'API ne voit pas les variables du fichier `.env`, lance plutôt `npx netlify dev`.

## Déployer sur Netlify

1. Crée un dépôt GitHub avec ce dossier et pousse-le.
2. Sur Netlify : *Add new project* > *Import an existing project*, puis choisis le dépôt.
   Les réglages (`npm run build`, dossier `dist`) viennent de `netlify.toml`.
3. Dans *Project configuration > Environment variables*, ajoute :
   - `APP_PASSWORD` : le mot de passe de ton carnet ;
   - `SESSION_SECRET` : une longue chaîne aléatoire (`openssl rand -hex 32`).
4. Déploie. La base est créée et la migration appliquée pendant le déploiement.

Sur le plan gratuit, les crédits mensuels sont partagés entre les déploiements, le trafic et la base.
Évite les déploiements inutiles et surveille *Team settings > Billing > Usage*.

## Structure

```
netlify/functions/api.mts       API : connexion + toutes les routes
netlify/database/migrations/    schéma SQL (appliqué automatiquement)
src/pages/                      écrans : ruches, visite, réglages
src/components/                 cadres, boutons, champs
```

## Modifier le schéma plus tard

N'édite jamais une migration déjà déployée. Ajoute un nouveau dossier
`netlify/database/migrations/<horodatage>_<description>/migration.sql`.
