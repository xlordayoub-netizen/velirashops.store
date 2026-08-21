/**
 * Met à jour les liens réseaux sociaux dans le document "Réglages du site".
 * Usage : npx sanity exec scripts/set-socials.mjs --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-10-01'})

const socials = {
  'contact.instagram': 'https://www.instagram.com/velira_watches',
  'contact.facebook': 'https://www.facebook.com/profile.php?id=61580842611564',
  'contact.tiktok': '',
}

for (const id of ['siteSettings', 'drafts.siteSettings']) {
  try {
    const doc = await client.getDocument(id)
    if (!doc) continue
    await client.patch(id).set(socials).commit()
    console.log(`✓ ${id} mis à jour`)
  } catch (err) {
    console.error(`✗ ${id} : ${err.message}`)
  }
}
