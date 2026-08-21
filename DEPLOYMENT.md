# VELIRA — Déploiement en production

Le site est **100 % statique** (HTML/CSS/JS) + un Studio Sanity. Aucun serveur
à gérer. Hébergement recommandé : **Netlify** (gratuit, HTTPS auto, CDN mondial).

---

## Étape 0 — Construire la version de production ⚠️ NOUVEAU

Le site se compile désormais dans `dist/` (minification, empreintes de
cache, CSS inliné, polices sous-ensemblées). **C'est `dist/` qu'on déploie,
plus la racine.**

```
npm install          # une seule fois (esbuild + subset-font)
npm run fonts        # une seule fois : télécharge les polices Google en WOFF2
node tools/subset-fonts.mjs   # une seule fois : sous-ensemble (-91 %)
npm run build        # à chaque mise en ligne → dist/
```

`npm run build` régénère aussi les empreintes des fichiers JS/CSS et les
hachages CSP dans `dist/_headers`. Ne jamais éditer `dist/` à la main.

---

## Étape 1 — Ce qu'on met en ligne

Sur Netlify, glissez-déposez **le dossier `dist/`** (et rien d'autre).
Son contenu :

```
index.html
404.html
mentions-legales.html · confidentialite.html · cgv.html
content.json · robots.txt · sitemap.xml · _redirects
css/ · js/ · images/ (vos photos)
studio/            ← le Studio compilé (npm run build dans /sanity)
```

**Ne PAS mettre en ligne** : `sanity/`, `node_modules/`, `tools/`, les
sources non minifiées — `npm run build` ne copie dans `dist/` que ce qui
doit être servi.

Avant de déployer, reconstruire le Studio si son schéma a changé :
```
cd sanity && npm run build      # génère /studio, puis relancer npm run build à la racine
```

---

## Étape 2 — Mettre en ligne sur Netlify (méthode simple, sans Git)

1. Créez un compte sur **netlify.com**.
2. Menu **Sites → Add new site → Deploy manually**.
3. Glissez-déposez le **dossier du projet** dans la zone d'upload.
4. Netlify met le site en ligne sous une adresse temporaire type
   `velira-123.netlify.app`. Vérifiez qu'il fonctionne.

> `_redirects` est déjà présent : il fait que `/studio/*` sert bien le Studio
> (sinon les liens profonds du Studio renvoient une 404).

**Méthode Git (recommandée pour la suite)** : poussez le projet sur GitHub,
puis Netlify → *Import from Git*. Chaque modification poussée se redéploie seule.

---

## Étape 3 — Connecter votre nom de domaine

Une fois le domaine acheté (ex. `velira.ma` chez un registrar) :

1. Netlify → votre site → **Domain management → Add a domain** → tapez
   `velira.ma` → **Verify → Add**.
2. Netlify affiche les enregistrements DNS à créer. Chez votre registrar
   (là où vous avez acheté le domaine), dans la zone DNS, ajoutez :

   | Type | Nom / Hôte | Valeur | 
   |------|-----------|--------|
   | `A` | `@` | `75.2.60.5` *(IP Netlify affichée à l'écran)* |
   | `CNAME` | `www` | `<votre-site>.netlify.app` |

   > Utilisez toujours les valeurs **affichées par Netlify** : elles priment sur
   > ce tableau si elles diffèrent. Alternative plus simple : déléguer les
   > *nameservers* du domaine à Netlify (Netlify vous donne 4 adresses `dnsX.p0X.nsone.net`
   > à coller chez le registrar) — Netlify gère alors tout le DNS.
3. Propagation DNS : de quelques minutes à 24–48 h.
4. Netlify active **HTTPS (Let's Encrypt) automatiquement** une fois le DNS
   propagé. Activez **Force HTTPS**.

---

## Étape 4 — Après la mise en ligne (obligatoire)

1. **Remplacer le domaine placeholder `velira.ma`** par votre vrai domaine dans :
   - `index.html` (balises `canonical`, `og:url`, `og:image`, `twitter:image`)
   - `robots.txt` (ligne `Sitemap:`)
   - `sitemap.xml` (les 4 `<loc>`)
   - `tools/build.mjs` (constante `SITE_URL` — pages OG produit /produits/*)
   - `tools/update-static-wa.mjs` (constante `SITE`), puis relancer
     `node tools/update-static-wa.mjs` (liens WhatsApp de secours sans JS)
   Puis relancer `npm run build` et redéployer.
   > Les liens WhatsApp générés par JavaScript utilisent automatiquement le
   > domaine réel (`location.origin`) — aucun réglage nécessaire pour eux.
2. **Ajouter l'image de partage social** : déposez un visuel **1200 × 630 px**
   (JPG ou PNG) à `images/og-cover.jpg`. Sans ça, les partages WhatsApp/Facebook
   n'afficheront pas d'aperçu visuel.
3. **CORS Sanity** : sur manage.sanity.io → projet `dvss1you` → API → CORS
   origins → ajoutez `https://votredomaine.com` (avec credentials). Sinon le
   Studio en ligne ne pourra pas charger le contenu.
4. **Compléter les pages légales** : remplacez les `[À COMPLÉTER]` dans
   `mentions-legales.html` et `cgv.html` (raison sociale, ICE, RC, adresse, ville).
5. **Ajouter les vraies photos** des montres via le Studio (`/studio` → Media).

---

## Étape 5 — Vérification finale en ligne

- [ ] Page d'accueil s'affiche, 9 montres visibles
- [ ] Un bouton « Commander sur WhatsApp » ouvre WhatsApp avec le bon nom
- [ ] `/studio` charge et la connexion Sanity fonctionne
- [ ] Pages légales accessibles depuis le footer
- [ ] Une URL au hasard (ex. `/xyz`) affiche la page 404
- [ ] HTTPS actif (cadenas), `https://` forcé
