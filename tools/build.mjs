/**
 * Build de production VELIRA → dist/
 *
 * - minifie CSS / JS / HTML
 * - empreinte (hash) dans les noms de fichiers JS  → cache 1 an sûr
 * - INLINE tout le CSS dans <head> : supprime 2 requêtes bloquantes.
 *   Le CSS minifié pèse ~18 Ko (~4 Ko gzip) : le découper en « critique +
 *   différé » coûterait un risque de FOUC pour un gain nul à cette taille.
 * - copie les actifs statiques (images, polices, pages légales, studio…)
 *
 * Les sources restent lisibles et éditables ; seul dist/ est déployé.
 */
import {mkdir, readFile, writeFile, cp, rm, readdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {join, extname} from 'node:path'
import {createHash} from 'node:crypto'
import * as esbuild from 'esbuild'

const ROOT = process.cwd()
const DIST = join(ROOT, 'dist')
const hash8 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 8)
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1)

await rm(DIST, {recursive: true, force: true})
await mkdir(DIST, {recursive: true})

const report = []

/* ---------- 0. Contenu Sanity : une seule requête, réutilisée partout ----------
   Sans cela le HTML servi contient les fiches de démo : le visiteur les voit
   tant que le fetch client n'a pas répondu (2 à 4 s en 4G), et les garde
   DÉFINITIVEMENT si Sanity est indisponible ou son quota épuisé — avec des
   boutons de commande pointant vers des montres inexistantes.
   On régénère donc ici la grille statique ET content.json depuis la même
   source. Le fetch client reste en place : il continue d'appliquer les
   mises à jour publiées après le build.
   Sanity injoignable au build → on conserve les fichiers existants tels
   quels : le build n'échoue jamais. */
const SITE_URL = 'https://velirashops.store'
const FALLBACK_WHATSAPP = '212617753569'
const DEFAULT_WA_MESSAGE =
  'مرحبًا VELIRA،\n\nأرغب في طلب هذه الساعة:\n\n⌚ الموديل: {produit}\n💰 السعر: {prix}\n🔗 {url}\n\nيرجى تأكيد التوفر وطرق التوصيل.\n\nمع خالص التحية.'

/* Identiques aux fonctions de js/main.js : les slugs DOIVENT concorder,
   sinon data-slug, les ancres #produit-<slug> et les pages OG divergent. */
const slugFor = (name) =>
  String(name == null ? '' : name).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'montre'

const escHtml = (s) => String(s == null ? '' : s)
  .replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]))

const isSanityAsset = (src) => typeof src === 'string' && src.includes('cdn.sanity.io')
const isSvgAsset = (src) => /\.svg($|\?)/i.test(src || '')
function sanityImg(src, opts) {
  const o = opts || {}
  if (!isSanityAsset(src) || isSvgAsset(src)) return src
  const p = new URLSearchParams()
  if (o.w) p.set('w', String(Math.round(o.w)))
  p.set('q', String(o.q == null ? 90 : o.q))
  p.set('auto', 'format')
  p.set('fit', o.fit || 'max')
  return src + (src.includes('?') ? '&' : '?') + p.toString()
}
function sanitySrcset(src, widths) {
  if (!isSanityAsset(src) || isSvgAsset(src)) return ''
  return widths.map((w) => sanityImg(src, {w}) + ' ' + w + 'w').join(', ')
}
const W_PRODUCT = [600, 1200, 1800]
const SIZES_PRODUCT = '(min-width:1024px) 300px, (min-width:560px) 45vw, 90vw'

function buildWhatsAppUrl(phone, message) {
  let c = String(phone == null ? '' : phone).replace(/[^0-9]/g, '')
  if (c.startsWith('00')) c = c.slice(2)
  else if (c.length === 10 && c.startsWith('0')) c = '212' + c.slice(1)
  return 'https://wa.me/' + c + '?text=' + encodeURIComponent(message == null ? '' : message)
}
/* Même composition que waHrefFor() côté client, lignes vides comprises. */
function waHrefFor(tpl, phone, product, price, url) {
  const filled = String(tpl)
    .replace('{produit}', () => (product == null ? '' : product))
    .replace('{prix}', () => (price == null ? '' : price))
    .replace('{url}', () => (url == null ? '' : url))
  const message = filled.split('\n').filter((line) => {
    const t = line.trim()
    const isDetail = /^[⌚💰🔗]/u.test(t)
    const isEmpty = /:$/.test(t) || /^[⌚💰🔗]$/u.test(t)
    return !(isDetail && isEmpty)
  }).join('\n').replace(/\n{3,}/g, '\n\n')
  return buildWhatsAppUrl(phone, message)
}

const placeholderSvg = (label, w, h, bg) =>
  `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E%3Crect width='100%25' height='100%25' fill='%23${bg}'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif' font-size='34' fill='%23666666'%3E${encodeURIComponent(label)}%3C/text%3E%3C/svg%3E`

/* Le logo WhatsApp est LU dans js/main.js plutôt que recopié ici :
   une seule définition, donc aucune divergence possible entre la carte
   rendue au build et celle rendue par le client. */
const mainJsSource = await readFile(join(ROOT, 'js/main.js'), 'utf8')
const WA_LOGO_SVG = (mainJsSource.match(/const waLogoSvg\s*=\s*'([^']+)'/) || [])[1] || ''

const SANITY_QUERY = `{
    "settings": *[_type=="siteSettings"][0]{
      whatsappNumber, waMessage, productCta, contact, seo, headerCta, nav,
      trustBar, sections, finalCta, footer,
      hero{eyebrow, titleMain, titleItalic, sub, ctaPrimary, ctaSecondary, trustLine,
        "image": {"src": image.asset->url, "alt": image.alt}}
    },
    "products": *[_type=="product"]|order(order asc){
      name, desc, price, badge,
      "imgFront": imgFront.asset->url, "imgHover": imgHover.asset->url
    },
    "reviews": *[_type=="review"]|order(order asc){initials, name, city, model, stars, text},
    "faq": *[_type=="faqItem"]|order(order asc){question, answer}
  }`

async function fetchSanity() {
  try {
    const url = `https://dvss1you.apicdn.sanity.io/v2024-10-01/data/query/production?query=${encodeURIComponent(SANITY_QUERY)}`
    const r = await fetch(url)
    if (!r.ok) return null
    const {result} = await r.json()
    if (!result || !Array.isArray(result.products) || !result.products.length) return null
    return result
  } catch { return null }
}

const sanity = await fetchSanity()
const localContent = JSON.parse(await readFile(join(ROOT, 'content.json'), 'utf8'))

/* Produits retenus : Sanity si joignable, sinon le content.json du dépôt. */
const catalogue = sanity ? sanity.products : (localContent.products || [])
const waNumber = (sanity && sanity.settings && sanity.settings.whatsappNumber) || localContent.whatsappNumber || FALLBACK_WHATSAPP
const waTemplate = (() => {
  const fromSanity = sanity && sanity.settings && sanity.settings.waMessage
  if (fromSanity && String(fromSanity).includes('{produit}')) return fromSanity
  if (localContent.waMessage && String(localContent.waMessage).includes('{produit}')) return localContent.waMessage
  return DEFAULT_WA_MESSAGE
})()

/* Grille statique : structure identique à celle produite par main.js, pour
   que data-slug / data-product / data-price — dont dépend le suivi TikTok
   (ViewContent, AddToCart, InitiateCheckout) — soient corrects dès le
   premier octet servi, sans attendre le moindre appel réseau. */
function productCardHtml(p) {
  const slug = slugFor(p.name)
  const front = p.imgFront ? sanityImg(p.imgFront, {w: 1200}) : placeholderSvg(`[IMAGE — ${p.name}]`, 900, 1080, 'F5F5F5')
  const hover = p.imgHover ? sanityImg(p.imgHover, {w: 1200}) : placeholderSvg(`[AUTRE ANGLE — ${p.name}]`, 900, 1080, 'D9D9D9')
  const frontSet = sanitySrcset(p.imgFront, W_PRODUCT)
  const hoverSet = sanitySrcset(p.imgHover, W_PRODUCT)
  const frontAttrs = frontSet ? ` srcset="${escHtml(frontSet)}" sizes="${SIZES_PRODUCT}"` : ''
  const hoverAttrs = hoverSet ? ` srcset="${escHtml(hoverSet)}" sizes="${SIZES_PRODUCT}"` : ''
  const badge = p.badge ? `<span class="product-badge">${escHtml(p.badge)}</span>` : ''
  const href = waHrefFor(waTemplate, waNumber, `VELIRA ${p.name}`, `${p.price} DH`, `${SITE_URL}/produits/${slug}`)
  return `
          <li class="product-card" id="produit-${slug}">
            <a class="product-link js-wa" href="${escHtml(href)}" target="_blank" rel="noopener noreferrer" data-product="VELIRA ${escHtml(p.name)}" data-price="${escHtml(p.price)} DH" data-slug="${slug}"
               aria-label="اطلب VELIRA ${escHtml(p.name)}، ${escHtml(p.price)} درهم، عبر واتساب">
              <figure class="product-media">
                ${badge}
                <img class="img-front" src="${escHtml(front)}"${frontAttrs} alt="VELIRA ${escHtml(p.name)} — ${escHtml(p.desc)}" width="900" height="1080" loading="lazy" decoding="async">
                <img class="img-alt" aria-hidden="true" src="${escHtml(hover)}"${hoverAttrs} alt="" width="900" height="1080" loading="lazy" decoding="async">
              </figure>
              <div class="product-meta">
                <h3 class="product-name">${escHtml(p.name)}</h3>
                <p class="product-desc">${escHtml(p.desc)}</p>
                <p class="product-price">${escHtml(p.price)}&nbsp;DH</p>
                <span class="product-cta">${WA_LOGO_SVG}اطلب<span class="cta-suffix"> عبر واتساب</span></span>
              </div>
            </a>
          </li>`
}
const staticGridHtml = catalogue.map(productCardHtml).join('')

/* Schéma produit servi en dur : Googlebot le lit au premier passage, sans
   attendre le rendu JS. « url » pointe vers l'ancre de la fiche sur
   l'accueil — la page réellement indexable — et non vers /produits/<slug>
   qui est en noindex. Aucune note ni avis n'est déclaré : le site n'en
   collecte pas, en inventer serait une violation des règles Google. */
const productSchemaJson = catalogue.length ? JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: catalogue.map((p, i) => {
    const slug = slugFor(p.name)
    return {
      '@type': 'Product',
      position: i + 1,
      name: `VELIRA ${p.name}`,
      description: p.desc || `VELIRA ${p.name}`,
      image: p.imgFront ? sanityImg(p.imgFront, {w: 1200}) : `${SITE_URL}/images/og-cover.jpg`,
      url: `${SITE_URL}/#produit-${slug}`,
      brand: {'@id': `${SITE_URL}/#brand`},
      offers: {
        '@type': 'Offer',
        price: String(p.price),
        priceCurrency: 'MAD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/#produit-${slug}`,
      },
    }
  }),
}) : ''

/* content.json régénéré : Sanity fait foi champ par champ, les valeurs
   locales sont conservées là où Sanity ne définit rien (et « logo » n'est
   jamais pris du CMS — c'est un actif de marque, pas du contenu client). */
const regeneratedContent = (() => {
  if (!sanity) return null
  const s = sanity.settings || {}
  const out = {...localContent}
  for (const k of ['whatsappNumber', 'waMessage', 'productCta', 'contact', 'seo',
                   'headerCta', 'nav', 'trustBar', 'sections', 'finalCta', 'footer', 'hero']) {
    if (s[k] != null) out[k] = s[k]
  }
  out.products = sanity.products.map((p) => ({
    id: slugFor(p.name),
    name: p.name,
    desc: p.desc,
    price: p.price,
    badge: p.badge || null,
    imgFront: p.imgFront || null,
    imgHover: p.imgHover || null,
  }))
  if (Array.isArray(sanity.reviews) && sanity.reviews.length) out.reviews = sanity.reviews
  if (Array.isArray(sanity.faq) && sanity.faq.length) out.faq = sanity.faq
  return out
})()

/* ---------- 1. CSS ---------- */
const minCss = async (file) => {
  const src = await readFile(join(ROOT, file), 'utf8')
  const out = await esbuild.transform(src, {loader: 'css', minify: true})
  report.push({asset: file, before: kb(src), after: kb(out.code)})
  return out.code
}
const stylesMin = await minCss('css/styles.css')
const legalMin = await minCss('css/legal.css')
/* fonts.css : url() relatives au dossier fonts/ → préfixées avant inline.
   Testé aussi en data-URI base64 : le HTML passait de 49,9 à 57,9 Ko et le
   LCP se dégradait (3,1 → 3,2 s). Les fichiers préchargés restent meilleurs. */
let fontsMin = await minCss('fonts/fonts.css')
fontsMin = fontsMin.replace(/url\(([^)]+\.woff2)\)/g, (m, u) => `url(fonts/${u.replace(/['"]/g, '')})`)

/* ---------- 2. JS (minifié + haché) ---------- */
const minJs = async (file) => {
  const src = await readFile(join(ROOT, file), 'utf8')
  const out = await esbuild.transform(src, {
    loader: 'js',
    minify: true,
    target: ['es2019'],          /* compatible Android ancien */
    legalComments: 'none',
  })
  report.push({asset: file, before: kb(src), after: kb(out.code)})
  return out.code
}
const mainJs = await minJs('js/main.js')
const cfgJs = await minJs('js/sanity-config.js')
const mainName = `main.${hash8(mainJs)}.js`
const cfgName = `sanity-config.${hash8(cfgJs)}.js`
await mkdir(join(DIST, 'js'), {recursive: true})
await writeFile(join(DIST, 'js', mainName), mainJs)
await writeFile(join(DIST, 'js', cfgName), cfgJs)

/* legal.css haché (les pages légales le référencent en externe) */
const legalName = `legal.${hash8(legalMin)}.css`
await mkdir(join(DIST, 'css'), {recursive: true})
await writeFile(join(DIST, 'css', legalName), legalMin)

/* ---------- 3. HTML ---------- */
const minifyHtml = async (html) =>
  (await esbuild.transform(html, {loader: 'css', minify: false})) && html
    /* commentaires HTML (hors conditionnels) */
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    /* espaces entre balises */
    .replace(/>\s+</g, '><')
    /* indentation résiduelle */
    .replace(/\n\s*/g, '\n')
    .replace(/\n+/g, '\n')
    .trim()

/* --- index.html --- */
let html = await readFile(join(ROOT, 'index.html'), 'utf8')
const htmlBefore = kb(html)

html = html
  .replace('<link rel="stylesheet" href="fonts/fonts.css">', `<style>${fontsMin}</style>`)
  .replace('<link rel="stylesheet" href="css/styles.css">', `<style>${stylesMin}</style>`)
  .replace('js/sanity-config.js', `js/${cfgName}`)
  .replace('js/main.js', `js/${mainName}`)

/* Grille produit servie = vrai catalogue. Les fiches de démo du dépôt ne
   sont remplacées que si Sanity a répondu : hors-ligne, on sert l'existant. */
if (staticGridHtml) {
  const before = html
  html = html.replace(
    /(<ul class="product-grid" id="product-grid">)[\s\S]*?(<\/ul>)/,
    (m, open, close) => open + staticGridHtml + '\n        ' + close
  )
  if (html === before) console.warn('  ⚠ grille produit introuvable dans index.html — non régénérée')
}

/* Remplit le bloc JSON-LD catalogue (placeholder vide dans la source). */
if (productSchemaJson) {
  const before = html
  html = html.replace(
    /(<script type="application\/ld\+json" id="velira-products-schema">)[\s\S]*?(<\/script>)/,
    (m, open, close) => open + productSchemaJson + close
  )
  if (html === before) console.warn('  ⚠ bloc schéma produit introuvable — non rempli')
}

html = await minifyHtml(html)
await writeFile(join(DIST, 'index.html'), html)
report.push({asset: 'index.html', before: htmlBefore, after: kb(html)})

/* --- pages secondaires --- */
/* --- contact.html (utilise styles.css comme index.html) --- */
if (existsSync(join(ROOT, 'contact.html'))) {
  let ct = await readFile(join(ROOT, 'contact.html'), 'utf8')
  const ctBefore = kb(ct)
  ct = ct
    .replace('<link rel="stylesheet" href="fonts/fonts.css">', `<style>${fontsMin}</style>`)
    .replace('<link rel="stylesheet" href="css/styles.css">', `<style>${stylesMin}</style>`)
  ct = await minifyHtml(ct)
  await writeFile(join(DIST, 'contact.html'), ct)
  report.push({asset: 'contact.html', before: ctBefore, after: kb(ct)})
}

for (const page of ['404.html', 'mentions-legales.html', 'confidentialite.html', 'cgv.html']) {
  if (!existsSync(join(ROOT, page))) continue
  let p = await readFile(join(ROOT, page), 'utf8')
  const b = kb(p)
  p = p
    .replace('<link rel="stylesheet" href="fonts/fonts.css">', `<style>${fontsMin}</style>`)
    .replace('<link rel="stylesheet" href="css/legal.css">', `<link rel="stylesheet" href="css/${legalName}">`)
  p = await minifyHtml(p)
  await writeFile(join(DIST, page), p)
  report.push({asset: page, before: b, after: kb(p)})
}

/* ---------- 4. Actifs statiques ---------- */
for (const dir of ['images', 'studio']) {
  if (existsSync(join(ROOT, dir))) await cp(join(ROOT, dir), join(DIST, dir), {recursive: true})
}
/* polices : uniquement les .woff2 (fonts.css est inliné) */
await mkdir(join(DIST, 'fonts'), {recursive: true})
for (const f of await readdir(join(ROOT, 'fonts'))) {
  if (extname(f) === '.woff2') await cp(join(ROOT, 'fonts', f), join(DIST, 'fonts', f))
}
for (const f of ['robots.txt', 'sitemap.xml', 'content.json', '_redirects', 'serve.json']) {
  if (existsSync(join(ROOT, f))) await cp(join(ROOT, f), join(DIST, f))
}
/* content.json du dépôt écrasé par la version Sanity : le secours hors-ligne
   décrit alors le vrai catalogue et non les fiches de démo. */
if (regeneratedContent) {
  await writeFile(join(DIST, 'content.json'), JSON.stringify(regeneratedContent, null, 2) + '\n')
}

/* ---------- 4b. CSP : hachage des scripts inline ----------
   La CSP reste stricte (`script-src 'self'`, pas de 'unsafe-inline').
   Chaque script inline du HTML final est haché en SHA-256 et autorisé
   nominativement. Calculé APRÈS minification pour correspondre à l'octet près. */
const inlineScripts = new Set()
for (const page of await readdir(DIST)) {
  if (extname(page) !== '.html') continue
  const content = await readFile(join(DIST, page), 'utf8')
  for (const m of content.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)) {
    /* Les blocs application/ld+json ne sont JAMAIS exécutés par le
       navigateur : script-src ne s'y applique pas. Les hacher gonflerait
       l'en-tête CSP à chaque donnée structurée ajoutée, sans rien
       autoriser d'utile. */
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(m[1])) continue
    if (m[2].trim()) inlineScripts.add(m[2])
  }
}
const hashes = [...inlineScripts]
  .map((s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`)
  .join(' ')
let headers = await readFile(join(ROOT, '_headers'), 'utf8')
headers = headers.replace('__INLINE_SCRIPT_HASHES__', hashes)
await writeFile(join(DIST, '_headers'), headers)
console.log(`\nCSP : ${inlineScripts.size} script(s) inline haché(s)`)

/* ---------- 4c. Pages produit Open Graph ----------
   WhatsApp ne transmet JAMAIS le fragment #ancre au serveur : un lien
   « /#produit-x » afficherait le même aperçu générique pour toutes les
   montres. On génère donc une vraie page /produits/<slug> par produit,
   portant ses balises OG (photo + nom + prix) pour l'aperçu WhatsApp,
   et qui redirige instantanément le visiteur vers la fiche sur l'accueil.
   Redirection par <meta refresh> UNIQUEMENT (pas de script inline → CSP
   stricte intacte ; le crawler WhatsApp ne suit pas la redirection et
   lit les balises OG). */
/* Réutilise le catalogue déjà chargé en section 0 : une seule requête
   Sanity par build. */
const products = catalogue.map((p) => ({name: p.name, price: p.price, img: p.imgFront}))
await mkdir(join(DIST, 'produits'), {recursive: true})
for (const p of products) {
  const slug = slugFor(p.name)
  const title = `VELIRA ${escHtml(p.name)} — ${p.price} DH`
  const image = p.img ? `${p.img}?w=1200&q=90&auto=format&fit=max` : `${SITE_URL}/images/og-cover.jpg`
  const target = `/#produit-${slug}`
  const page = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${title}</title>
<link rel="canonical" href="${SITE_URL}/${target === '/' ? '' : target.slice(1)}">
<meta property="og:type" content="product">
<meta property="og:title" content="${title}">
<meta property="og:description" content="Paiement à la livraison partout au Maroc · Retour gratuit 14 jours · Garantie 2 ans.">
<meta property="og:url" content="${SITE_URL}/produits/${slug}">
<meta property="og:image" content="${escHtml(image)}">
<meta property="og:site_name" content="VELIRA">
<meta property="og:locale" content="fr_MA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${escHtml(image)}">
<meta http-equiv="refresh" content="0; url=${target}">
</head><body>
<p><a href="${target}">Voir la ${title} sur la boutique VELIRA</a></p>
</body></html>`
  await writeFile(join(DIST, 'produits', `${slug}.html`), page)
}
console.log(`\npages OG produit : ${products.length} générées dans dist/produits/`)

/* ---------- 5. Rapport ---------- */
console.log('\nfichier                    avant      apres')
console.log('------------------------------------------------')
for (const r of report) {
  console.log(`${r.asset.padEnd(26)} ${(r.before + ' Ko').padStart(9)}  ${(r.after + ' Ko').padStart(9)}`)
}
console.log(`\nJS haché  : js/${mainName}`)
console.log(`CSS légal : css/${legalName}`)
console.log('Build → dist/')
