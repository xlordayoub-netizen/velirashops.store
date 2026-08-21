import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'product',
  title: 'Produit',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Nom', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'desc', title: 'Description courte', type: 'string'}),
    defineField({
      name: 'price',
      title: 'Prix (DH)',
      type: 'number',
      validation: (r) => r.required().positive(),
    }),
    defineField({
      name: 'badge',
      title: 'Badge (optionnel)',
      description: 'Exemple : Best-seller, Nouveau. Laissez vide pour ne rien afficher.',
      type: 'string',
    }),
    defineField({
      name: 'imgFront',
      title: 'Photo principale',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'imgHover',
      title: 'Photo au survol',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'order',
      title: "Ordre d'affichage",
      type: 'number',
      initialValue: 0,
    }),
  ],
  orderings: [
    {title: "Ordre d'affichage", name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'name', subtitle: 'desc', media: 'imgFront'},
  },
})
