import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {media} from 'sanity-plugin-media'
import {schemaTypes} from './schemas/index.js'
import {projectId, dataset} from './project.js'

/* Le singleton "Réglages du site" est épinglé en haut ; les listes
   (produits, avis, FAQ) sont triées par leur champ "order". */
const structure = (S) =>
  S.list()
    .title('Contenu VELIRA')
    .items([
      S.listItem()
        .title('Réglages du site')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.divider(),
      S.documentTypeListItem('product').title('Produits'),
      S.documentTypeListItem('review').title('Avis clients'),
      S.documentTypeListItem('faqItem').title('FAQ'),
    ])

export default defineConfig({
  name: 'velira',
  title: 'VELIRA — Studio',
  projectId,
  dataset,
  /* basePath est défini UNIQUEMENT dans sanity.cli.js (project.basePath) :
     le déclarer aussi ici double le préfixe (/studio/studio) et casse les
     liens internes du Studio. */
  /* media() ajoute l'onglet « Media » : bibliothèque d'images visuelle
     (glisser-déposer, remplacement, suppression, tags, recherche) et
     remplace le sélecteur d'image de chaque champ. */
  plugins: [structureTool({structure}), media()],
  schema: {
    types: schemaTypes,
    /* Un seul document "Réglages du site" : on retire le type du menu "créer" */
    templates: (templates) => templates.filter((t) => t.schemaType !== 'siteSettings'),
  },
  document: {
    /* Interdit la suppression / duplication du singleton */
    actions: (actions, context) =>
      context.schemaType === 'siteSettings'
        ? actions.filter(({action}) => !['delete', 'duplicate'].includes(action))
        : actions,
  },
})
