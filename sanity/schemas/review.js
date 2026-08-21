import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'review',
  title: 'Avis client',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Nom affiché', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'city', title: 'Ville', type: 'string'}),
    defineField({
      name: 'initials',
      title: 'Initiales (pastille)',
      type: 'string',
      validation: (r) => r.max(3),
    }),
    defineField({name: 'model', title: 'Modèle acheté', type: 'string'}),
    defineField({
      name: 'stars',
      title: 'Note (1 à 5)',
      type: 'number',
      initialValue: 5,
      validation: (r) => r.required().min(1).max(5).integer(),
    }),
    defineField({name: 'text', title: 'Témoignage', type: 'text', rows: 4}),
    defineField({name: 'order', title: "Ordre d'affichage", type: 'number', initialValue: 0}),
  ],
  orderings: [
    {title: "Ordre d'affichage", name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]},
  ],
  preview: {select: {title: 'name', subtitle: 'model'}},
})
