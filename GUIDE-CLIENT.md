# VELIRA — Guide client

Ce guide complète [GUIDE-STUDIO.md](GUIDE-STUDIO.md) (comment utiliser le Studio).
Il porte sur **la qualité des photos**, qui décide à elle seule de l'allure
haut de gamme du site.

---

## Qualité des photos

Le site affiche vos photos en très grand sur les écrans modernes. Une image
trop petite ne peut pas être « agrandie » : elle devient floue, définitivement.
Le site optimise automatiquement chaque image (redimensionnement, WebP,
compression) — mais il ne peut pas inventer des pixels absents du fichier
d'origine.

### Les 4 règles

1. **Minimum 2000 px sur le plus grand côté — idéalement 3000 px.**
   En dessous, la photo sera floue sur les écrans Retina (iPhone, Mac,
   téléviseurs). Pour vérifier sous Windows : clic droit sur le fichier →
   *Propriétés* → onglet *Détails* → ligne *Dimensions*.

2. **Ne JAMAIS réutiliser une photo passée par WhatsApp ou Instagram.**
   Ces applications recompressent les images et suppriment définitivement
   des détails. Une photo reçue par WhatsApp fait souvent moins de 1000 px :
   elle sera toujours floue sur le site, quoi qu'on fasse. Reprenez toujours
   **le fichier d'origine**, depuis l'appareil photo ou le photographe.

3. **Exporter en JPG qualité 90–100 %** (Photoshop, Lightroom, Canva…).
   En dessous de 90 %, des artefacts apparaissent autour des contours nets —
   très visibles sur l'acier poli d'une montre. Le PNG convient aussi, mais
   produit des fichiers plus lourds pour de la photo.

4. **Pas de captures d'écran.**
   Une capture d'écran est limitée à la résolution de votre écran (souvent
   1366 px de large) et contient déjà une compression. Le résultat est
   systématiquement flou.

### Tailles conseillées par emplacement

| Emplacement | Taille minimale | Idéal |
|---|---|---|
| Photo d'accueil (grande) | 2000 × 2400 px | 2400 × 3000 px |
| Photos produit (2 par montre) | 1800 × 2160 px | 2400 × 2880 px |
| Photos « Savoir-faire » | 1600 × 1200 px | 2400 × 1800 px |
| Logo | **SVG de préférence** | sinon PNG 3× la taille d'affichage |

### Le logo — cas particulier

Le meilleur format est un **SVG** : il reste net à toutes les tailles et pèse
quelques kilo-octets. Si vous n'avez qu'un PNG, fournissez-le en **fond
transparent** et au moins 600 px de large.

⚠️ Le logo s'affiche à **40 px de haut** dans l'en-tête. N'y téléversez pas
un « lockup » complet (pictogramme + VELIRA + WATCHES) : à 40 px, le texte
devient illisible. Le site affiche déjà le nom VELIRA en typographie à côté
du pictogramme — le champ logo n'attend donc que **le pictogramme seul**
(l'horloge), ou rien du tout : le pictogramme intégré au site est un SVG
parfaitement net.

### Comment vérifier après un téléversement

1. Publiez dans le Studio, puis rechargez le site avec **Ctrl + F5**.
2. Zoomez à 200 % (Ctrl + molette) : la photo doit rester nette.
3. Si elle est floue à 100 %, c'est que le fichier source est trop petit —
   retéléversez une version plus grande.

---

## Personnaliser le message WhatsApp de commande

Quand un client clique sur **« Commander sur WhatsApp »**, WhatsApp s'ouvre
avec un message déjà écrit. Vous pouvez modifier ce texte.

### Où le trouver

1. Ouvrez le **Studio** (adresse de votre site suivie de `/studio`).
2. Cliquez sur **« Réglages du site »**.
3. Restez sur l'onglet **« Général »** (le premier).
4. Le champ s'appelle **« Message WhatsApp de commande »**.

### Les 3 repères (à recopier tels quels)

Le message contient des repères entre accolades, remplacés automatiquement
pour chaque montre :

| Repère | Devient… | Exemple |
|---|---|---|
| `{produit}` | le nom de la montre — **obligatoire** | VELIRA Origine |
| `{prix}` | le prix avec « DH » | 349 DH |
| `{url}` | le lien direct vers la montre (affiche sa **photo** dans WhatsApp) | velira.ma/produits/origine |

**Règles simples :**
- Écrivez les repères **exactement** ainsi, accolades comprises : `{produit}`.
- **Ne supprimez jamais `{produit}`.** Le Studio vous empêchera de publier
  sans lui, et même en cas d'oubli le site rétablit tout seul le message par
  défaut — vos boutons ne peuvent donc jamais tomber en panne.
- `{prix}` et `{url}` sont facultatifs. Une ligne dont le repère reste vide
  est retirée automatiquement (pas de « Prix : » tout seul).
- Après modification, cliquez **Publish**, puis rechargez le site
  (**Ctrl + F5**) pour voir le nouveau message.

### 2 modèles prêts à copier-coller

**Modèle 1 — complet (recommandé, avec photo)**

```
Bonjour VELIRA,

Je souhaite commander cette montre :

⌚ Modèle : {produit}
💰 Prix : {prix}
🔗 {url}

Merci de me confirmer la disponibilité et les modalités de livraison.

Cordialement.
```

**Modèle 2 — court et direct**

```
Bonjour VELIRA, je veux commander la montre {produit} ({prix}). {url}
Est-elle disponible ? Merci !
```
