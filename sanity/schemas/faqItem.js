import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'faqItem',
  title: 'Question FAQ',
  type: 'document',
  fields: [
    defineField({name: 'question', title: 'Question', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'answer', title: 'Réponse', type: 'text', rows: 4}),
    defineField({name: 'order', title: "Ordre d'affichage", type: 'number', initialValue: 0}),
  ],
  orderings: [
    {title: "Ordre d'affichage", name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]},
  ],
  preview: {select: {title: 'question'}},
})
