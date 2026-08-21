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

/* ---------- 4b. CSP : hachage des scripts inline ----------
   La CSP reste stricte (`script-src 'self'`, pas de 'unsafe-inline').
   Chaque script inline du HTML final est haché en SHA-256 et autorisé
   nominativement. Calculé APRÈS minification pour correspondre à l'octet près. */
const inlineScripts = new Set()
for (const page of await readdir(DIST)) {
  if (extname(page) !== '.html') continue
  const content = await readFile(join(DIST, page), 'utf8')
  for (const m of content.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (m[1].trim()) inlineScripts.add(m[1])
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
const SITE_URL = 'https://velirashops.store'

const slugFor = (name) =>
  String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'montre'

async function fetchProducts() {
  try {
    const q = encodeURIComponent('*[_type=="product"]|order(order asc){name, price, "img": imgFront.asset->url}')
    const r = await fetch(`https://dvss1you.apicdn.sanity.io/v2024-10-01/data/query/production?query=${q}`)
    if (r.ok) {
      const {result} = await r.json()
      if (Array.isArray(result) && result.length) return result
    }
  } catch { /* hors-ligne → secours local */ }
  const local = JSON.parse(await readFile(join(ROOT, 'content.json'), 'utf8'))
  return (local.products || []).map((p) => ({name: p.name, price: p.price, img: p.imgFront}))
}

const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]))
const products = await fetchProducts()
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
