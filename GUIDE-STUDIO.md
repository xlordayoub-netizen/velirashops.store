# VELIRA — Guide Sanity Studio

Le site est géré par un **Sanity Studio**, comme un projet Sanity classique.
L'ancien panneau `admin.html` a été supprimé.

> **✔ Mise en service TERMINÉE le 19/07/2026** — projet « web desinge watches »
> (ID `dvss1you`, dataset `production`), 18 documents importés, CORS
> configuré pour `http://localhost:4173`. Passez directement à la section 2.
> Il ne reste qu'à ajouter votre futur domaine en ligne dans les CORS origins.

---

## 1. Mise en service (déjà faite — référence en cas de changement de projet)

1. **Créez un projet Sanity gratuit** : https://www.sanity.io/manage
   → « Create project » → notez le **Project ID** (8 caractères, ex. `ab12cd34`).
2. **Renseignez l'ID à deux endroits** :
   - `sanity/project.js` → remplacez `replaceme` par votre ID.
   - `js/sanity-config.js` → même remplacement.
3. **Autorisez votre site (CORS)** : sur manage.sanity.io → votre projet →
   *API* → *CORS origins* → ajoutez `http://localhost:4173` (et plus tard
   votre domaine, ex. `https://velira.ma`).
4. **Connectez-vous et importez le contenu existant** — dans un terminal :

   ```
   cd "C:\Users\Hp\WEB site ecom\sanity"
   npx sanity login
   npm run migrate
   npm run import-content
   ```

   Tout le contenu actuel (produits, avis, FAQ, textes) arrive dans Sanity.
5. **Reconstruisez le Studio** (à refaire après tout changement d'ID ou de schéma) :

   ```
   npm run build
   ```

   Le Studio est généré dans le dossier `studio/` du site → accessible sur
   **votresite.com/studio**.

---

## 2. Utiliser le Studio au quotidien

- Ouvrez **/studio** sur votre site (ou `npm run dev` dans `sanity/` pour
  la version locale sur http://localhost:3333/studio).
- Connectez-vous avec votre compte Sanity.
- Le contenu est organisé en 4 entrées :
  - **Réglages du site** — WhatsApp, message de commande, menu,
    bandeau de confiance, section d'accueil, titres de sections,
    bandeau final, pied de page, SEO. Tout est rangé par onglets.
  - **Produits** — nom, description, prix, badge, photos ; ajouter/supprimer/réordonner.
  - **Avis clients** — témoignages avec note et ville.
  - **FAQ** — questions et réponses.
- Cliquez **Publish** après chaque modification : le site se met à jour
  immédiatement (rechargez la page avec Ctrl + F5).

## 3. Les photos — Studio d'images « Media »

Ouvrez l'onglet **Media** dans la barre du Studio (ou directement
**/studio/media**) : c'est votre bibliothèque d'images.

- **Ajouter** : bouton « Upload assets » ou glisser-déposer vos fichiers.
- **Organiser** : créez des **tags** (ex. « produits », « accueil ») et
  filtrez ; recherche par nom.
- **Supprimer** : sélectionnez une image → corbeille.
- **Utiliser** : dans n'importe quel champ image (produit, accueil),
  cliquez « Select » pour choisir depuis la bibliothèque, ou
  glissez-déposez directement dans le champ.

Chaque **Publish** met à jour le site immédiatement (API temps réel, sans
cache). Remplissez le champ « Texte alternatif » pour l'accessibilité.

> 📐 **Qualité des photos** : le site redimensionne et optimise vos images
> automatiquement, mais il ne peut pas inventer des pixels manquants.
> Téléversez au minimum **2000 px** sur le grand côté et n'utilisez jamais
> une image passée par WhatsApp. Détails : [GUIDE-CLIENT.md](GUIDE-CLIENT.md).

## 4. Bon à savoir

- Tant que le Project ID n'est pas renseigné, le site affiche le contenu
  de secours de `content.json` — il ne peut jamais être vide.
- `content.json` sert aussi de source pour l'import initial. Après
  l'import, la source de vérité est Sanity.
- Studio local : `npm run dev` · Reconstruire /studio : `npm run build`
  · Héberger le Studio chez Sanity : `npm run deploy`.
