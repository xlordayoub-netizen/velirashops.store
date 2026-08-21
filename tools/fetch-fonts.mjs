/**
 * Télécharge les polices Google en WOFF2 et génère fonts/fonts.css local.
 * On ne garde que les sous-ensembles « latin » et « latin-ext » (accents
 * français) : c'est le sous-ensemblage demandé, sans outil externe.
 * Supprime la requête tierce bloquante vers fonts.googleapis.com.
 */
import {mkdir, writeFile} from 'node:fs/promises'
import {join} from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'fonts')
await mkdir(OUT, {recursive: true})

/* Axes VARIABLES (wght@400..600) : un seul fichier couvre toutes les
   graisses au lieu d'un fichier par graisse — ~2x plus léger. */
const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Archivo:wght@400..600' +
  '&family=Cormorant+Garamond:ital,wght@0,500..600;1,500&display=swap'

/* UA Chrome moderne → Google renvoie du WOFF2 uniquement */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

const css = await fetch(CSS_URL, {headers: {'User-Agent': UA}}).then((r) => r.text())

const blocks = css.split('@font-face').slice(1)
const keep = []
for (const b of blocks) {
  const subset = (b.match(/\/\*\s*([a-z-]+)\s*\*\//) || [])[1] || 'unknown'
  if (subset !== 'latin' && subset !== 'latin-ext') continue
  const family = (b.match(/font-family:\s*'([^']+)'/) || [])[1]
  /* police variable → « font-weight: 400 600 » (plage) */
  const weight = (b.match(/font-weight:\s*([\d\s]+);/) || [])[1].trim()
  const style = (b.match(/font-style:\s*(\w+)/) || [])[1] || 'normal'
  const url = (b.match(/url\(([^)]+)\)/) || [])[1]
  const range = (b.match(/unicode-range:\s*([^;]+);/) || [])[1]
  if (!url) continue
  const slug = `${family.toLowerCase().replace(/\s+/g, '-')}-${weight.replace(/\s+/g, '-')}-${style}-${subset}.woff2`
  const buf = Buffer.from(await fetch(url, {headers: {'User-Agent': UA}}).then((r) => r.arrayBuffer()))
  await writeFile(join(OUT, slug), buf)
  keep.push({family, weight, style, slug, range, kb: (buf.length / 1024).toFixed(1)})
  console.log(`${slug.padEnd(46)} ${(buf.length / 1024).toFixed(1)} KB`)
}

const out = keep
  .map(
    (f) => `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};` +
      `font-display:swap;src:url('${f.slug}') format('woff2');unicode-range:${f.range}}`
  )
  .join('\n')

await writeFile(join(OUT, 'fonts.css'), out + '\n', 'utf8')
console.log(`\nfonts/fonts.css : ${keep.length} déclarations, total ${keep.reduce((a, f) => a + +f.kb, 0).toFixed(1)} KB`)
