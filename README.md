# Carnet de rucher

Outil de suivi de ruches (Dadant 10, Dadant 8…), accessible depuis un ordinateur ou un téléphone.
Tout est hébergé sur Netlify : l'interface (Vite + React), l'API (une Netlify Function) et la base (Netlify Database, Postgres).

## Ce que fait le carnet

- Ruches : création, modification, statut (active, morte, fusionnée, vendue), suppression.
  L'accueil dessine les ruches rangées par rucher : hausses de la dernière visite, couleur de la reine,
  ruche voilée si elle n'est plus active.
- Modèles de ruche : le nombre de cadres du corps pilote le formulaire de visite.
- Ruchers avec position GPS (bouton « Utiliser ma position », saisie manuelle, lien vers la carte).
- Reines : année, marquage (couleur proposée selon l'année), souche, historique des changements.
- Visites : cadres du corps (vide, bâti, couvain, miel, pollen, partition isolante), reine et œufs vus,
  cellules royales, hausses, comportement, actions, météo, notes. Les cadres sont repris de la visite précédente.
- Météo automatique : si le rucher a des coordonnées GPS, la température, le vent et le ciel de l'heure
  de la visite sont préremplis depuis Open-Meteo (gratuit, sans clé). Ils restent modifiables.

- Traitements : produit, dose, motif, dates de début et de fin. Un traitement sans date de fin est en cours :
  il se termine d'un appui et la liste des ruches le signale.
- Nourrissements : type de nourriture, quantité, total de l'année.
- Récoltes : quantité, miel, notes, total par année.

Ces trois registres se trouvent sur la fiche de chaque ruche.

Pour suivre les colonies :
- Fiche ruche : courbes de développement (couvain, miel, cadres d'abeilles), et un historique unique
  qui mêle visites, traitements, nourrissements, récoltes et reines, filtrable par type, action,
  période et texte des notes. Deux visites peuvent être comparées cadre par cadre.
- Alertes : visite prévue dépassée, ruche non visitée depuis plus de 14 jours (de mars à octobre),
  cellules royales, pas d'œufs deux visites de suite, comportement qui se dégrade.
- Prochaine visite : une date à planifier depuis la fiche ou en fin de visite. Une visite faite
  efface la date prévue si elle est atteinte.
- Tableau de bord : toutes les ruches actives sur une page, celles à surveiller d'abord.
- Bilan de saison : récolte, visites, nourrissement et registre des traitements de l'année,
  exportable en CSV (pour un tableur en français) ou imprimable en PDF.

Sur un écran de plus de 900 px, la barre du bas devient un menu latéral et la fiche d'une ruche
passe sur deux colonnes (infos, reine et registres à gauche, visites à droite).

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
src/pages/                      écrans : ruches, visite, tableau de bord, bilan, réglages
src/components/                 cadres, boutons, champs
```

## Modifier le schéma plus tard

N'édite jamais une migration déjà déployée. Ajoute un nouveau dossier
`netlify/database/migrations/<horodatage>_<description>/migration.sql`.
