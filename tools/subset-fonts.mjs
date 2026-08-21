/**
 * Sous-ensemblage AU NIVEAU DES GLYPHES (harfbuzz via subset-font).
 * Les fichiers Google « latin » contiennent ~500 glyphes ; le site en
 * utilise ~120. On conserve un jeu français complet + ponctuation + symboles
 * pour que TOUT contenu saisi dans le Studio reste rendu correctement.
 *
 * Entrée  : fonts/*.woff2 (téléchargés par fetch-fonts.mjs)
 * Sortie  : fonts/*.woff2 réécrits + fonts/fonts.css régénéré
 */
import {readFile, writeFile, readdir} from 'node:fs/promises'
import {join} from 'node:path'
import subsetFont from 'subset-font'

const FONTS = join(process.cwd(), 'fonts')

/* Jeu de caractères conservé : latin de base + accents FR + ponctuation
   typographique + symboles monétaires/usuels. Large volontairement :
   le contenu vient du CMS et doit pouvoir tout afficher. */
const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'abcdefghijklmnopqrstuvwxyz' +
  '0123456789' +
  ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~' +
  'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß' +
  'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ' +
  'ŒœŠšŸŽž' +
  '€£¥¢°©®™±×÷' +
  '–—‑‒…«»“”‘’‚„•·‹›' +
  '¹²³½¼¾' +
  '   '   /* espaces insécables utilisés en français */

const rows = []
for (const file of await readdir(FONTS)) {
  if (!file.endsWith('.woff2')) continue
  const buf = await readFile(join(FONTS, file))
  const out = await subsetFont(buf, CHARS, {targetFormat: 'woff2'})
  await writeFile(join(FONTS, file), out)
  rows.push({file, before: buf.length, after: out.length})
  console.log(
    `${file.padEnd(50)} ${(buf.length / 1024).toFixed(1).padStart(6)} Ko -> ` +
      `${(out.length / 1024).toFixed(1).padStart(6)} Ko  (-${Math.round((1 - out.length / buf.length) * 100)}%)`
  )
}

/* fonts.css régénéré SANS unicode-range : le sous-ensemble contient
   désormais tous les caractères utiles, les fichiers « latin-ext » font
   double emploi et sont retirés. */
const keep = rows.filter((r) => r.file.includes('-latin.woff2'))
const decl = keep
  .map((r) => {
    const f = r.file
    const family = f.startsWith('archivo') ? 'Archivo' : 'Cormorant Garamond'
    const italic = f.includes('-italic-')
    const weight = f.includes('500-600') ? '500 600' : f.includes('400-600') ? '400 600' : '500'
    return (
      `@font-face{font-family:'${family}';font-style:${italic ? 'italic' : 'normal'};` +
      `font-weight:${weight};font-display:swap;src:url('${f}') format('woff2')}`
    )
  })
  .join('\n')
await writeFile(join(FONTS, 'fonts.css'), decl + '\n', 'utf8')

const total = keep.reduce((a, r) => a + r.after, 0)
console.log(`\nfonts.css : ${keep.length} declarations — total charge ${(total / 1024).toFixed(1)} Ko`)
