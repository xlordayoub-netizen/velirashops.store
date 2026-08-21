/**
 * Met à jour les hrefs WhatsApp STATIQUES d'index.html (secours sans JS)
 * avec le modèle français + URL produit, et pose les ancres
 * id="produit-<slug>" sur les 4 cartes statiques.
 * (Le rendu JS régénère tout depuis le CMS ; ceci n'est que le fallback.)
 */
import {readFile, writeFile} from 'node:fs/promises'

const FILE = new URL('../index.html', import.meta.url)
const PHONE = '212617753569'
const SITE = 'https://velira.ma'

const slugFor = (name) =>
  name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const msgProduct = (name, price, slug) =>
  `Bonjour VELIRA,\n\nJe souhaite commander cette montre :\n\n⌚ Modèle : ${name}\n💰 Prix : ${price}\n🔗 ${SITE}/produits/${slug}\n\nMerci de me confirmer la disponibilité et les modalités de livraison.\n\nCordialement.`

const msgGeneric =
  `Bonjour VELIRA,\n\nJe souhaite commander cette montre :\n\n⌚ Modèle : Collection VELIRA\n\nMerci de me confirmer la disponibilité et les modalités de livraison.\n\nCordialement.`

const msgQuestion =
  `Bonjour VELIRA,\n\nJ'ai une question au sujet de vos montres.\n\nCordialement.`

const wa = (m) => `https://wa.me/${PHONE}?text=${encodeURIComponent(m)}`

let html = await readFile(FILE, 'utf8')

/* Chaque ancien href contient un marqueur unique « Product%3A%20<nom> » */
const swaps = [
  {marker: 'Product%3A%20Collection%20VELIRA', href: wa(msgGeneric)},
  {marker: 'Product%3A%20Question', href: wa(msgQuestion)},
]
const products = [
  {name: 'VELIRA Origine', price: '349 DH'},
  {name: 'VELIRA Éclipse', price: '429 DH'},
  {name: 'VELIRA Héritage', price: '399 DH'},
  {name: 'VELIRA Rive', price: '379 DH'},
]
for (const p of products) {
  const slug = slugFor(p.name.replace(/^VELIRA\s+/, ''))
  swaps.push({marker: 'Product%3A%20' + encodeURIComponent(p.name).replace(/%20/g, '%20'), href: wa(msgProduct(p.name, p.price, slug)), slug, name: p.name})
}

let replaced = 0
for (const s of swaps) {
  const re = new RegExp(`href="https://wa\\.me/${PHONE}\\?text=[^"]*${s.marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"`, 'g')
  html = html.replace(re, () => { replaced++; return `href="${s.href}"` })
}

/* Ancres + data-slug sur les 4 cartes statiques */
let anchored = 0
for (const p of products) {
  const slug = slugFor(p.name.replace(/^VELIRA\s+/, ''))
  const liRe = new RegExp(`<li class="product-card"( data-reveal[^>]*)>(\\s*<a class="product-link js-wa"[^>]*data-product="${p.name}")`)
  html = html.replace(liRe, (m, a, b) => { anchored++; return `<li class="product-card" id="produit-${slug}"${a}>${b}` })
  html = html.replace(`data-product="${p.name}" data-price=`, `data-product="${p.name}" data-slug="${slug}" data-price=`)
}

await writeFile(FILE, html, 'utf8')
console.log(`hrefs remplacés : ${replaced} — ancres posées : ${anchored}`)
const leftover = (html.match(/Product%3A/g) || []).length
console.log(`anciens messages restants : ${leftover}`)
