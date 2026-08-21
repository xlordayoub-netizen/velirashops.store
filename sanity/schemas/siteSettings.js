import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Réglages du site',
  type: 'document',
  groups: [
    {name: 'general', title: 'Général', default: true},
    {name: 'header', title: 'Menu & confiance'},
    {name: 'hero', title: 'Accueil'},
    {name: 'sectionsG', title: 'Titres de sections'},
    {name: 'cta', title: 'Bandeau final'},
    {name: 'footerG', title: 'Pied de page'},
  ],
  fields: [
    /* ---------- Général ---------- */
    defineField({
      name: 'whatsappNumber',
      title: 'Numéro WhatsApp',
      description: 'Format international sans le « + » — exemple : 212617753569',
      type: 'string',
      group: 'general',
      validation: (r) => r.required().regex(/^\d{8,15}$/, {name: 'numéro international'}),
    }),
    defineField({
      name: 'waMessage',
      title: 'Message WhatsApp de commande',
      description:
        'Message pré-rempli quand un client clique « Commander sur WhatsApp ». ' +
        'Trois repères sont remplacés automatiquement : ' +
        '{produit} = nom de la montre (OBLIGATOIRE — ne pas le supprimer), ' +
        '{prix} = prix avec « DH », ' +
        '{url} = lien direct vers la montre (affiche sa photo dans WhatsApp). ' +
        'Astuce : une ligne dont le repère est vide (ex. un CTA sans prix) est retirée automatiquement. ' +
        'Si {produit} est absent, le site rétablit le message par défaut pour ne jamais envoyer un message inutilisable.',
      type: 'text',
      rows: 8,
      group: 'general',
      validation: (r) =>
        r.custom((value) => {
          if (!value) return true /* vide = modèle par défaut, autorisé */
          return value.includes('{produit}')
            ? true
            : 'Le repère {produit} est obligatoire : sans lui, le vendeur ne sait pas quelle montre est commandée.'
        }),
    }),
    defineField({
      name: 'productCta',
      title: 'Texte du bouton WhatsApp des cartes produit',
      type: 'string',
      group: 'general',
    }),
    defineField({
      name: 'contact',
      title: 'Contact & réseaux sociaux',
      type: 'object',
      group: 'general',
      fields: [
        {name: 'email', title: 'E-mail de contact', type: 'string'},
        {name: 'instagram', title: 'Lien Instagram', type: 'string'},
        {name: 'facebook', title: 'Lien Facebook', type: 'string'},
        {name: 'tiktok', title: 'Lien TikTok', type: 'string'},
      ],
    }),
    defineField({
      name: 'seo',
      title: 'Référencement (SEO)',
      type: 'object',
      group: 'general',
      fields: [
        {name: 'title', title: "Titre de l'onglet", type: 'string'},
        {name: 'description', title: 'Description Google', type: 'text', rows: 3},
      ],
    }),
    /* Le champ « logo » a été RETIRÉ volontairement : le logo est un actif
       de marque figé, servi en local depuis images/velira-primary-transparent.png.
       Il ne doit pas être remplaçable depuis le Studio. */

    /* ---------- Menu & bandeau de confiance ---------- */
    defineField({
      name: 'headerCta',
      title: 'Bouton du menu (en haut à droite)',
      type: 'string',
      group: 'header',
    }),
    defineField({
      name: 'nav',
      title: 'Liens du menu',
      type: 'array',
      of: [{type: 'string'}],
      group: 'header',
      validation: (r) => r.length(3),
    }),
    defineField({
      name: 'trustBar',
      title: 'Bandeau de confiance',
      type: 'object',
      group: 'header',
      fields: [
        {name: 'score', title: 'Note affichée (ex. 4,8/5)', type: 'string'},
        {name: 'count', title: "Nombre d'avis (ex. plus de 1 200 clients)", type: 'string'},
        {
          name: 'items',
          title: 'Garanties (3)',
          type: 'array',
          of: [{type: 'string'}],
          validation: (r) => r.length(3),
        },
      ],
    }),

    /* ---------- Accueil ---------- */
    defineField({
      name: 'hero',
      title: "Section d'accueil",
      type: 'object',
      group: 'hero',
      fields: [
        {name: 'eyebrow', title: 'Petite ligne au-dessus du titre', type: 'string'},
        {name: 'titleMain', title: 'Titre — première partie', type: 'string'},
        {name: 'titleItalic', title: 'Titre — partie en italique', type: 'string'},
        {name: 'sub', title: 'Texte sous le titre', type: 'text', rows: 3},
        {name: 'ctaPrimary', title: 'Bouton principal', type: 'string'},
        {name: 'ctaSecondary', title: 'Lien secondaire', type: 'string'},
        {name: 'trustLine', title: 'Ligne de confiance', type: 'string'},
        {
          name: 'image',
          title: "Grande image d'accueil",
          type: 'image',
          options: {hotspot: true},
          fields: [{name: 'alt', title: 'Texte alternatif', type: 'string'}],
        },
      ],
    }),

    /* ---------- Titres de sections ---------- */
    defineField({
      name: 'sections',
      title: 'Titres et petites lignes des sections',
      type: 'object',
      group: 'sectionsG',
      fields: ['collection', 'avis', 'faq'].map((key) => ({
        name: key,
        title: {collection: 'Collection', avis: 'Avis', faq: 'FAQ'}[key],
        type: 'object',
        fields: [
          {name: 'eyebrow', title: 'Petite ligne', type: 'string'},
          {name: 'title', title: 'Titre', type: 'string'},
        ],
      })),
    }),

    /* ---------- Bandeau final ---------- */
    defineField({
      name: 'finalCta',
      title: 'Bandeau final (section noire)',
      type: 'object',
      group: 'cta',
      fields: [
        {name: 'eyebrow', title: 'Petite ligne', type: 'string'},
        {name: 'title', title: 'Titre', type: 'string'},
        {name: 'sub', title: 'Texte sous le titre', type: 'string'},
        {name: 'button', title: 'Texte du bouton', type: 'string'},
        {name: 'trustLine', title: 'Ligne de confiance', type: 'string'},
      ],
    }),

    /* ---------- Pied de page ---------- */
    defineField({
      name: 'footer',
      title: 'Pied de page',
      type: 'object',
      group: 'footerG',
      fields: [
        {name: 'tagline', title: 'Phrase sous le logo', type: 'string'},
        {name: 'clockLabel', title: "Libellé de l'horloge", type: 'string'},
        {name: 'collectionTitle', title: 'Titre colonne produits', type: 'string'},
        {name: 'helpTitle', title: 'Titre colonne aide', type: 'string'},
        {
          name: 'helpLinks',
          title: "Liens d'aide (le dernier ouvre WhatsApp)",
          type: 'array',
          of: [{type: 'string'}],
          validation: (r) => r.length(4),
        },
        {name: 'newsletterTitle', title: 'Titre newsletter', type: 'string'},
        {name: 'newsletterText', title: 'Texte newsletter', type: 'string'},
        {name: 'newsletterLabel', title: 'Étiquette du champ e-mail', type: 'string'},
        {name: 'newsletterPlaceholder', title: 'Exemple dans le champ', type: 'string'},
        {name: 'newsletterButton', title: 'Texte du bouton', type: 'string'},
        {name: 'newsletterSuccess', title: 'Message de confirmation', type: 'string'},
        {name: 'newsletterError', title: "Message d'erreur", type: 'string'},
        {name: 'copyright', title: 'Ligne de copyright', type: 'string'},
        {
          name: 'legalLinks',
          title: 'Liens légaux',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                {name: 'label', title: 'Libellé', type: 'string'},
                {name: 'href', title: 'Adresse (URL)', type: 'string'},
              ],
              preview: {select: {title: 'label'}},
            },
          ],
        },
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Réglages du site'})},
})
