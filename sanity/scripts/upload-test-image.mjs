/**
 * Téléverse la mire 3000x3000 dans Sanity et l'affecte au produit "Origine"
 * (imgFront) pour vérifier la chaîne d'images de bout en bout.
 * Usage : npx sanity exec scripts/upload-test-image.mjs --with-user-token
 */
import {getCliClient} from 'sanity/cli'
import {createReadStream} from 'node:fs'
import {join} from 'node:path'

const client = getCliClient({apiVersion: '2024-10-01'})
const file = join(process.env.TEMP || '/tmp', 'velira-test-3000.jpg')

const asset = await client.assets.upload('image', createReadStream(file), {
  filename: 'velira-test-3000.jpg',
})

console.log('Asset ID   :', asset._id)
console.log('Dimensions :', asset.metadata.dimensions.width + 'x' + asset.metadata.dimensions.height)
console.log('Taille     :', Math.round(asset.size / 1024) + ' KB')
console.log('URL        :', asset.url)

const target = await client.fetch('*[_type=="product" && name=="Origine"][0]{_id}')
if (!target) {
  console.error('Produit "Origine" introuvable.')
  process.exit(1)
}

await client
  .patch(target._id)
  .set({imgFront: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}})
  .commit()

console.log('OK — affecté à', target._id, '(champ imgFront)')
