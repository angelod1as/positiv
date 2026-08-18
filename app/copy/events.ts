type RulesAlert = {
  title: string
  body: string
}

type RulesSection = {
  heading: string
  body: string
  alert?: RulesAlert
}

const sections: RulesSection[] = [
  {
    heading: "🚨 Nenhuma pessoa é obrigada a nada 🚨",
    body: `“Você não é todo mundo”, já dizia minha mãe.

Se, durante toda a nossa experiência, você não quiser tomar parte em alguma coisa, **simplesmente não o faça**.

Se você não quiser conversar durante o evento, não converse. Se não quiser mandar nude no grupo do whatsapp, não mande. Se não quiser andar pelade na festa, não ande. Se não quiser comer os deliciosos quitutes que todo mundo vai levar, o azar é seu, porém, não coma.

Ninguém é obrigade a **nada**.

#### Claro, há excessões:

- Beber água;
- Seguir as regras;
- Responder todas essas questões corretamente.

Se, em qualquer parte do processo, você achar que não quer mais participar, apenas saia, sem ressentimentos (mas veja nossa política de reembolso para não ter nenhum susto).`,
  },
  {
    heading: "🤫 Você não fala sobre quem vai à Positiv 🤫",
    body: `Um de nossos pilares é a **privacidade de nossos participantes**.

Portanto, **não comentamos** sobre pessoas que conhecemos na festa ou no grupo.

Algumas pessoas têm empregos, relações familiares ou imagens públicas que podem ser afetadas negativamente se sua presença nas festas for revelada.

Lembre-se sempre: trate todas as pessoas com respeito e cuidado. Elus estão ali para se divertirem, assim como você, e tem vivências e prioridades que podem ser diferentes das suas.`,
    alert: {
      title: "🤫 Ninguém sabe até todo mundo saber 🤫",
      body: `Nunca falamos quem vai à uma festa antes do grupo do WhatsApp ser criado. Assim, todo mundo fica sabendo — ao mesmo tempo — quem vai ao mesmo evento.

Existem pouquíssimas — mesmo, quase nenhuma — excessões à essa regra.

"Ah, mas como vou saber se meu chefe vai estar na mesma festa que eu?" Do mesmo jeito que todo mundo: entrando no grupo do WhatsApp e lhe vendo lá. Falar para você que elu está na festa é um baita problema de privacidade, não acha?`,
    },
  },
  {
    heading: "👍 Apenas SIM é SIM 👍",
    body: `Essa é nossa **regra de ouro** do rolê.

- Ficou na dúvida? É **não**;
- Foi um não, que pareceu um sim? É **não**;
- “Ah, já fiquei outras vezes...” é **não**;
- Disse que ficava para depois? é **não**;
- A pessoa consentiu um beijo, mas pareceu desconfortável? **Afaste-se**!

A melhor forma para QUALQUER interação na festa é pedir por **consentimento**.

- Posso te abraçar?
- Posso te beijar?
- Quer ir para um lugar mais privado?
- Posso ver vcs transando?
- Você se importa se eu ficar aqui?

**Perguntar não dói**. Muita gente acha que perguntar vai quebrar o clima, mas, acreditem, um rolê **seguro** faz tudo ficar muito mais sexy!

Ah, e atenção: O consentimento de um beijo não vale para outras ações. Portanto, a cada movimento com a(s) pessoa(s), é preciso pedir o consentimento.`,
    alert: {
      title: "👀 Olhar tira pedaço, sim! 👀",
      body: `Sim, a gente sabe que tem muita gente gostosa na festa... E não somos socializades para entendermos o corpo nu como algo "normal" e muito menos a ver interações sexuais de outros (exceto pelo pornô).

Mas todas as pessoas do grupo designadas mulheres ao nascimento e/ou de gênero feminino já sofreram com pessoas encarando seus corpos, pegando neles e os desrespeitando.

Sabemos que é difícil ver algo lindo, como um corpo nu, e não se fixar naquilo. Mas lembrem que a experiência de ser encarade pode ser muito ruim para muita gente. Em algumas festas tivemos relatos de pessoas que se sentiram "violadas” pelo olhar fixo de alguém e queremos conscientizar, principalmente os homens cis, dessa experiência, porque muitos nunca nem pensaram a respeito.`,
    },
  },
  {
    heading: "🥡 A Positiv não é marmitaria 🥡",
    body: `Nós fazemos uma festa sex- e body-Positiv.

Diferente de uma casa de swing, **não há lugares privativos pra transar**.

A ideia da festa é justamente normalizar a nudez, o sexo, e a sexualidade. Sexo não é tabu.

Sabemos que nem todos são exibicionistas (e até existem uns cantos mais escondidinhos), porém é importante saber que nessa festa só há privacidade nos banheiros.

"Ah, mas eu tenho vergonha de transar com outras pessoas vendo". Então, talvez, a Positiv não seja para você, ou você pode ajustar suas expectativas para simplesmente não transar na festa.

“Ah, encontrei uma pessoa legal na festa e vou levá-la pra casa”: **por favor, não**. Se você quiser chamá-la para um rolê depois que tudo acabar, beleza. Não tirem as pessoas da festa — privando-as de outras experiências — para ter um espaço a sós com você.

Isso é mal-visto pois não somos uma marmitaria, uma festa agenciadora de casais e trisais, que saem do público para curtir seu momento no sigilo. Somos uma exaltação do público, do compartilhado, e da beleza que é a variedade de pessoas.

Respeito, por favor.`,
  },
  {
    heading: "😷 Proteção e saúde 😷",
    body: `**Camisinha sempre e exames atualizados.**

Recomendamos o uso de preservativos para **qualquer** interação sexual.

Nas interações pênis/vagina e pênis/ânus — indepentente dos materiais —, a camisinha é completamente **obrigatória** e **não tem conversa** — qualquer problema com essa regra pode incorrer em ações legais (isso, polícia te levando seminu do motel porque você tirou a camisinha durante a transa).

A gente sempre pede para que casais usem camisinha mesmo se transem sem em casa, porém quase nunca os casais o fazem… Por favor, se for um casal, respeite nossa regra.

**Recomendamos** o uso de luvas (ou camisinhas) para interações que envolvam mãos, e dental dams ou camisinhas cortadas para sexo oral.

Não fazemos distinção: use a camisinha que preferir, seja ela interna ou externa — aliás, esse é o melhor termo: “camisinha externa” ou “camisinha interna”.

Ah, esperamos que todes possam fazer um exame de ISTs antes da festa — em SP você consegue fazer de graça, rapidinho, pelo SUS. Nós não pedimos exames, porque isso poderia ser discriminatório, mas indicamos que todes façam seus controles regularmente.`,
    alert: {
      title: "🍆 A capa pode escapar... 🍆",
      body: `Às vezes, a camisinha escapa — sim, aconteceu, acontece, acontecerá.

O que a gente espera de você: pare TUDO o que estiver acontecendo e notifique as pessoas ao seu redor do que rolou. É um simples “olha, a camisinha escapou, ela tá aqui, vou colocar aqui do lado e pegar outra”.

Se a camisinha escapou dentro da pessoa, a conduta é a mesma, e vale o reforço na importância de testes de IST e, dependendo do caso, a famosa pílula do dia seguinte.

Acidentes acontecem; o que a gente quer é evitar mal-entendidos ou situações que podem gerar stress (como alguém achar que você tirou a camisinha no meio do sexo, o tal do stealthing, que é CRIME).

Numa suruba, você é tão responsável pelo seu corpo quanto pelos corpos de quem transa.`,
    },
  },
  {
    heading: "📸 Sem celular e sem fotos 📸",
    body: `Usar o celular e tirar fotos nas áreas do evento é **expressamente proibido**.

O acesso ao celular só é permitido na garagem da suíte.

- “Ah mas eu quero tirar selfies durante a festa”: não;
- “Ah mas eu quero fazer umas fotos trepando com meu crush”: não;
- “Ah mas”: não.`,
  },
  {
    heading: "💪 Experiência intensa 💪",
    body: `Por mais que nossa mensagem seja de tranquilidade, aceitação e paz, sabemos que um evento como o nosso possa ser intenso demais para algumas pessoas.

Portanto, perguntamos sempre: você está num bom lugar mental para participar de algo que vai **com certeza** desafiar sua zona de conforto?

A Positiv pode ser transformadora — já ouvimos isso de pessoas participantes — mas também pode ativar vários gatilhos. Portanto, saiba que você poderá se expôr a inúmeras sensações e sentimentos. Exemplos:

- Durante a festa a música ambiente se mescla com o som de gemidos. Como você lida com isso?
- É possível que você esteja conversando tranquilamente e, de repente, comecem a transar ali do seu lado. E agora?
- Uma pessoa se aproximou de você, olhou em seus olhos, e perguntou se pode te dar um beijo. Você não quer. Como você age?

Essas perguntas hipotéticas — porém baseadas em casos reais — podem criar cenários apocalípticos na mente de pessoas ansiosas, mas servem mais para uma autoanálise e uma reflexão do tipo: estou pronto para ser desafiade?`,
  },
  {
    heading: "🗑️ Não deixe rastros 🧼🫧",
    body: `Nossa missão é deixar o espaço, no fim da festa, do mesmo jeito que o encontramos quando chegamos.

A manutenção do ambiente é de responsabilidade de TODES — não só das pessoas administradoras

#### Limpeza

Esperamos das pessoas participantes que recolham seu próprio lixo — seja ele migalhas de comida que caíram no chão, uma embalagem de lubrificante que acabou, ou uma camisinha usada.

A gente tá cansado de recolher camisinha usada no fim da festa. Sério.

#### Trouxe? Leve.

Primeiro: **não temos achados e perdidos**. Os itens esquecidos no espaço do evento **ficam no espaço do evento**.

Segundo: suas coisas são de sua responsabilidade, **inclusive suas comidas e bebidas**. Levou à festa um delicioso bolo e sobrou um pedaço? **Leve embora**.

A comida que não for retirada será **descartada**, e isso é péssimo. Fica nas mãos das pessoas administradoras a responsabilidade de organizar o espaço e a dor na consciência de jogar comida fora.

Se você não pode levar sua comida embora, tome você mesme a decisão de descartá-la.`,
  },
  {
    heading: "🕺 Não somos uma balada 🪩",
    body: `A palavra "festa" ou "evento" pode confundir algumas pessoas. Não somos uma balada — o evento é de dia, tem piscina, não tem música alta. É muito mais um picnic ou um churrasco com as pessoas amigas.

Tenha isso em mente ao se inscrever — não somos nada parecidos com casas de swing ou festas liberais. Não tem pista de dança, nem drink que pisca.`,
  },
]

export const rulesCopy = {
  title: "Regras e filosofias",
  intro: `Antes de se inscrever em nosso evento, precisamos ter certeza que você **leu** e **entendeu** as nossas principais regras e filosofias.

Portanto, criamos esse breve teste! Você só conseguirá se inscrever em nosso evento se todas as respostas estiverem corretas. _(Quem falou que suruba é bagunça, né?)_

Vamos ao que interessa:`,
  sections,
} as const
