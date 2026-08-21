import {defineCliConfig} from 'sanity/cli'
import {projectId, dataset} from './project.js'

export default defineCliConfig({
  api: {projectId, dataset},
  /* Indispensable : le Studio est servi sous /studio — sans ceci, le build
     référence ses fichiers JS à la racine du site et la page reste blanche. */
  project: {basePath: '/studio'},
})
