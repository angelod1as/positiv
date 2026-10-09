const fieldLabels = {
  title: "o título",
  subtitle: "o subtítulo",
  intro: "a introdução",
  body: "o corpo",
  cards: "os cartões",
  quotes: "os depoimentos",
  people: "as pessoas",
  image: "a imagem",
  count: "a quantidade",
  videoUrl: "o link do vídeo",
  videoTitle: "o título do vídeo",
  ctaLabel: "o texto do botão",
  caption: "a legenda",
  _type: "o tipo",
} as const

const genericMissing = "conteúdo obrigatório"

const listFormatter = new Intl.ListFormat("pt-BR", {
  style: "long",
  type: "conjunction",
})

const labelFor = (field: string) =>
  fieldLabels[field as keyof typeof fieldLabels] ?? genericMissing

const describeMissing = (missing: string[]) =>
  missing.length === 0
    ? genericMissing
    : listFormatter.format([...new Set(missing.map(labelFor))])

export const cmsPreviewCopy = {
  genericMissing,
  fieldLabels,
  incompleteSection: (missing: string[]) =>
    `Seção incompleta: falta ${describeMissing(missing)}`,
  incompleteHeader: (missing: string[]) =>
    `Cabeçalho incompleto: falta ${describeMissing(missing)}`,
} as const
