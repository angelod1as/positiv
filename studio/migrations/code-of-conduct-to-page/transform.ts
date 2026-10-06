import { LongRichTextBlock, markdownToLongPortableText } from "./markdown"

export const CODE_OF_CONDUCT_PAGE_ID = "page-codigo-de-conduta"

const TITLE = "Código de Conduta"

const INTRO =
  "Na Positiv, acreditamos que a celebração só existe plenamente quando todas as pessoas se sentem seguras, respeitadas e livres para viver a experiência que pretendemos propiciar. Por isso, assumimos o compromisso de construir e promover um ambiente inclusivo, acolhedor e livre de qualquer forma de violência."

const SEO_DESCRIPTION = "Código de conduta da Positiv"

const BODY = `## 1. Tolerância zero a assédio e abuso (incluindo preconceitos diversos)

Durante o evento e no grupo que antecede a ele, não serão toleradas atitudes de assédio, abuso, invasão de espaço pessoal, discriminação — racismo, machismo, LGBTfobia, gordofobia e qualquer ação ou comentário que fira a existência de um indivíduo ou grupo — ou comportamentos que coloquem outra pessoa em situação de insegurança ou vulnerabilidade.

Assédio inclui — mas não se limita a:

- Comentários indesejados de cunho sexual ou ofensivo
- Interações (virtuais ou não) sem consentimento
- Insistência de interações (sejam virtuais ou não)
- Tentativas de intimidar, coagir ou manipular.

## 2. Compromisso com um espaço seguro

Levamos a sério a criação de um espaço seguro para todes.

Por esse motivo, **a presença de pessoas que gerem incômodo, desrespeito ou que não representem segurança para o coletivo será inviabilizada.**

Isso significa que:

- A equipe pode advertir, intervir ou retirar do evento ou do grupo qualquer pessoa cujo comportamento viole este código.
- A decisão dos administradores da Positiv é soberana e tem como objetivo proteger o bem-estar coletivo.

Histórias de assédio que ocorrem **fora** do nosso ecossistema (evento ou grupo gerenciado pela Positiv) e que geram desconfortos, inseguranças e/ou incômodos aos participantes da festa, poderão incorrer na não aceitação da pessoa em nossos eventos, porque ferem, justamente, a segurança coletiva.

## 3. Canal oficial para denúncias

Temos um canal ativo e permanente para qualquer denúncia, relato ou pedido de apoio: **nosso WhatsApp oficial:** [(11) 94597-0336](https://wa.me/5511945970336)

Se você passar por alguma situação de incômodo, testemunhar algo suspeito ou simplesmente sentir que algo não está certo, **fale com a nossa equipe imediatamente**. Sua segurança é prioridade.

## 4. Consentimento é regra

Na Positiv:

- Uma pessoa só tem interesse se ela disser claramente que tem.
- “Talvez” é “não”.
- Pessoas alcoolizadas ou com consciência alterada **não podem** consentir.

Perguntar é sexy. Respeitar limites é obrigatório.

## 5. Cuidamos uns dos outros

Se algo parecer errado, ajude. Se não se sentir confortável para intervir, chame alguém da nossa equipe.

Segurança é responsabilidade coletiva — mas a responsabilidade de agir é nossa também.`

export type PageDocument = {
  _id: string
  _type: "page"
  title: string
  address: string
  header: {
    _type: "pageTitle"
    _key: string
    title: string
    intro: string
  }[]
  sections: {
    _type: "richTextSection"
    _key: string
    body: LongRichTextBlock[]
  }[]
  seo: { _type: "seo"; description: string; noIndex: boolean }
}

export function codeOfConductToPage(): PageDocument {
  return {
    _id: CODE_OF_CONDUCT_PAGE_ID,
    _type: "page",
    title: TITLE,
    address: "/codigo-de-conduta",
    header: [{ _type: "pageTitle", _key: "header", title: TITLE, intro: INTRO }],
    sections: [
      {
        _type: "richTextSection",
        _key: "code-of-conduct",
        body: markdownToLongPortableText(BODY),
      },
    ],
    seo: { _type: "seo", description: SEO_DESCRIPTION, noIndex: false },
  }
}
