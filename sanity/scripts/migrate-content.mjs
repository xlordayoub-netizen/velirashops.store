/**
 * Convertit ../content.json en content.ndjson, prêt pour :
 *   npx sanity dataset import content.ndjson production --replace
 *
 * Les images ne sont pas migrées (le site n'en a pas encore) :
 * elles s'ajoutent directement dans le Studio.
 */
import {readFileSync, writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const content = JSON.parse(readFileSync(join(here, '..', '..', 'content.json'), 'utf8'))

const docs = []

/* Singleton réglages du site */
docs.push({
  _id: 'siteSettings',
  _type: 'siteSettings',
  whatsappNumber: content.whatsappNumber,
  waMessage: content.waMessage,
  productCta: content.productCta,
  contact: content.contact,
  seo: content.seo,
  headerCta: content.headerCta,
  nav: content.nav,
  trustBar: content.trustBar,
  sections: content.sections,
  hero: {
    eyebrow: content.hero.eyebrow,
    titleMain: content.hero.titleMain,
    titleItalic: content.hero.titleItalic,
    sub: content.hero.sub,
    ctaPrimary: content.hero.ctaPrimary,
    ctaSecondary: content.hero.ctaSecondary,
    trustLine: content.hero.trustLine,
  },
  features: (content.features || []).map((f, i) => ({
    _key: 'feature-' + i,
    title: f.title,
    text: f.text,
  })),
  finalCta: content.finalCta,
  footer: {
    ...content.footer,
    legalLinks: (content.footer.legalLinks || []).map((l, i) => ({
      _key: 'legal-' + i,
      label: l.label,
      href: l.href,
    })),
  },
})

/* Produits */
content.products.forEach((p, i) => {
  docs.push({
    _id: 'product-' + (p.id || i),
    _type: 'product',
    name: p.name,
    desc: p.desc,
    price: p.price,
    badge: p.badge || undefined,
    order: i,
  })
})

/* Avis */
content.reviews.forEach((r, i) => {
  docs.push({
    _id: 'review-' + i,
    _type: 'review',
    name: r.name,
    city: r.city,
    initials: r.initials,
    model: r.model,
    stars: r.stars,
    text: r.text,
    order: i,
  })
})

/* FAQ */
content.faq.forEach((f, i) => {
  docs.push({
    _id: 'faq-' + i,
    _type: 'faqItem',
    question: f.question,
    answer: f.answer,
    order: i,
  })
})

const out = join(here, '..', 'content.ndjson')
writeFileSync(out, docs.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf8')
console.log(`content.ndjson : ${docs.length} documents écrits.`)
