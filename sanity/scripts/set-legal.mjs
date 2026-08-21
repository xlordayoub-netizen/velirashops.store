/**
 * Renseigne les URLs des liens légaux dans "Réglages du site".
 * Usage : npx sanity exec scripts/set-legal.mjs --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-10-01'})

const legalLinks = [
  {_key: 'legal-0', label: 'Mentions légales', href: '/mentions-legales.html'},
  {_key: 'legal-1', label: 'Confidentialité', href: '/confidentialite.html'},
  {_key: 'legal-2', label: 'CGV', href: '/cgv.html'},
]

for (const id of ['siteSettings', 'drafts.siteSettings']) {
  try {
    const doc = await client.getDocument(id)
    if (!doc) continue
    await client.patch(id).set({'footer.legalLinks': legalLinks}).commit()
    console.log(`✓ ${id} mis à jour`)
  } catch (err) {
    console.error(`✗ ${id} : ${err.message}`)
  }
}
