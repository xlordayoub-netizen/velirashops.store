/**
 * Met à jour le numéro WhatsApp et le message de commande.
 * Usage : npx sanity exec scripts/set-whatsapp.mjs --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-10-01'})

const patch = {
  whatsappNumber: '212617753569',
  waMessage:
    'Bonjour VELIRA,\n\nJe souhaite commander cette montre :\n\n⌚ Modèle : {produit}\n💰 Prix : {prix}\n🔗 {url}\n\nMerci de me confirmer la disponibilité et les modalités de livraison.\n\nCordialement.',
}

for (const id of ['siteSettings', 'drafts.siteSettings']) {
  try {
    const doc = await client.getDocument(id)
    if (!doc) continue
    await client.patch(id).set(patch).commit()
    console.log(`✓ ${id} mis à jour`)
  } catch (err) {
    console.error(`✗ ${id} : ${err.message}`)
  }
}
