// Seed-owned content the e2e specs assert and the generated fixtures must carry.
// Kept in sync with studio/seed/seed.ts; studio/fixtures/fixtures.test.ts fails
// when a value here is missing from the fixtures, so a seed change can't drift
// silently.
export const testPageContent = {
  address: '/pagina-de-teste',
  sentinel: 'Se você chegou aqui, parabéns, encontrou nossa página de teste.',
  aboutTitle: 'Como assim?',
  richTextHeading: 'Seção de teste',
  founderName: 'Ana Exemplo',
  imageAlt: 'Imagem de exemplo dos testes end-to-end',
  seoDescription: 'Página exclusiva dos testes end-to-end.',
} as const

export const siteSettingsContent = {
  pageLinkLabel: 'Equipe',
  pageLinkAddress: '/sobre/equipe',
  footerColumnTitle: 'A Positiv',
  footerLinkLabel: 'Sobre',
  footerLinkAddress: '/sobre',
  noticeText: 'Aviso de exemplo',
  noticeLinkLabel: 'Saiba mais nos eventos',
  noticeLinkHref: '/eventos',
} as const
