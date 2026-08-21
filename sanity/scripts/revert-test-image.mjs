/**
 * Retire la mire de test du produit "Origine" (l'asset reste dans la
 * bibliothèque Media pour pouvoir re-tester à tout moment).
 * Usage : npx sanity exec scripts/revert-test-image.mjs --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-10-01'})
const doc = await client.fetch('*[_type=="product" && name=="Origine"][0]{_id, imgFront}')
if (!doc) { console.error('Produit introuvable'); process.exit(1) }

await client.patch(doc._id).unset(['imgFront']).commit()
console.log('OK — mire de test retirée de', doc._id, '(asset conservé dans Media)')
