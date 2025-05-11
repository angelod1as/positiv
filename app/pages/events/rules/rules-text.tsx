import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Separator } from "~/components/ui/separator"

export const RulesText = () => {
  return (
    <>
      {/* INTRO */}
      <>
        <h1>Regras e filosofias</h1>
        <p>
          Antes de se inscrever em nosso evento, precisamos ter certeza que você{" "}
          <b>leu</b> e <b>entendeu</b> as nossas principais regras e filosofias.
        </p>
        <p>
          Portanto, criamos esse breve teste! Você só conseguirá se inscrever em
          nosso evento se todas as respostas estiverem corretas.{" "}
          <small>(Quem falou que suruba é bagunça, né?)</small>
        </p>
        <p>Vamos ao que interessa:</p>
      </>

      <Separator />

      <>
        <h4>🚨 Nenhuma pessoa é obrigada a nada 🚨</h4>

        <p>“Você não é todo mundo”, já dizia minha mãe.</p>
        <p>
          Se, durante toda a nossa experiência, você não quiser tomar parte em
          alguma coisa, <b>simplesmente não o faça</b>.
        </p>
        <p>
          Se você não quiser conversar durante o evento, não converse. Se não
          quiser mandar nude no grupo do whatsapp, não mande. Se não quiser
          andar pelade na festa, não ande. Se não quiser comer os deliciosos
          quitutes que todo mundo vai levar, o azar é seu, porém, não coma.
        </p>
        <p>
          Ninguém é obrigade a <b>nada</b>.
        </p>
        <h4>Claro, há excessões:</h4>
        <ul className="list-inside list-disc">
          <li>Beber água;</li>
          <li>Seguir as regras;</li>
          <li>Responder todas essas questões corretamente.</li>
        </ul>
        <p>
          Se, em qualquer parte do processo, você achar que não quer mais
          participar, apenas saia, sem ressentimentos (mas veja nossa política
          de reembolso para não ter nenhum susto).
        </p>
      </>

      <Separator />

      <>
        <h4>
          🤫 Você <b>não</b> fala sobre quem vai à Positiv 🤫
        </h4>
        <p>
          Um de nossos pilares é a <b>privacidade de nossos participantes</b>.
        </p>
        <p>
          Portanto, <b>não comentamos</b> sobre pessoas que conhecemos na festa
          ou no grupo.
        </p>
        <p>
          Algumas pessoas têm empregos, relações familiares ou imagens públicas
          que podem ser afetadas negativamente se sua presença nas festas for
          revelada.
        </p>
        <p>
          Lembre-se sempre: trate todas as pessoas com respeito e cuidado. Elus
          estão ali para se divertirem, assim como você, e tem vivências e
          prioridades que podem ser diferentes das suas.
        </p>
        <Alert className="flex flex-col gap-4">
          <AlertTitle>🤫 Ninguém sabe até todo mundo saber 🤫</AlertTitle>
          <AlertDescription className="flex flex-col gap-4">
            <p>
              Nunca falamos quem vai à uma festa antes do grupo do Whatsapp ser
              criado. Assim, todo mundo fica sabendo — ao mesmo tempo — quem vai
              ao mesmo evento.
            </p>
            <p>
              Existem pouquíssimas — mesmo, quase nenhuma — excessões à essa
              regra.
            </p>
            <p>
              "Ah, mas como vou saber se meu chefe vai estar na mesma festa que
              eu?" Do mesmo jeito que todo mundo: entrando no grupo do Whatsapp
              e lhe vendo lá. Falar para você que elu está na festa é um baita
              problema de privacidade, não acha?
            </p>
          </AlertDescription>
        </Alert>
      </>

      <Separator />

      <>
        <h4>👍 Apenas SIM é SIM 👍</h4>
        <p>
          Essa é nossa <b>regra de ouro</b> do rolê.
        </p>
        <ul className="list-inside list-disc">
          <li>
            Ficou na dúvida? É <strong>não</strong>;
          </li>
          <li>
            Foi um não, que pareceu um sim? É <strong>não</strong>;
          </li>
          <li>
            “Ah, já fiquei outras vezes...” é <strong>não</strong>;
          </li>
          <li>
            Disse que ficava para depois? é <strong>não</strong>;
          </li>
          <li>
            A pessoa consentiu um beijo, mas pareceu desconfortável?{" "}
            <strong>Afaste-se</strong>!
          </li>
        </ul>
        <p>
          A melhor forma para QUALQUER interação na festa é pedir por{" "}
          <strong>consentimento</strong>.
        </p>
        <ul className="list-inside list-disc">
          <li>Posso te abraçar?</li>
          <li>Posso te beijar?</li>
          <li>Quer ir para um lugar mais privado?</li>
          <li>Posso ver vcs transando?</li>
          <li>Você se importa se eu ficar aqui?</li>
        </ul>
        <p>
          <strong>Perguntar não dói</strong>. Muita gente acha que perguntar vai
          quebrar o clima, mas, acreditem, um rolê <b>seguro</b> faz tudo ficar
          muito mais sexy!
        </p>
        <p>
          Ah, e atenção: O consentimento de um beijo não vale para outras ações.
          Portanto, a cada movimento com a(s) pessoa(s), é preciso pedir o
          consentimento.
        </p>

        <Alert className="flex flex-col gap-4">
          <AlertTitle>👀 Olhar tira pedaço, sim! 👀</AlertTitle>
          <AlertDescription className="flex flex-col gap-4">
            <p>
              Sim, a gente sabe que tem muita gente gostosa na festa... E não
              somos socializades para entendermos o corpo nu como algo "normal"
              e muito menos a ver interações sexuais de outros (exceto pelo
              pornô).
            </p>
            <p>
              Mas todas as pessoas do grupo designadas mulheres ao nascimento
              e/ou de gênero feminino já sofreram com pessoas encarando seus
              corpos, pegando neles e os desrespeitando.
            </p>
            <p>
              Sabemos que é difícil ver algo lindo, como um corpo nu, e não se
              fixar naquilo. Mas lembrem que a experiência de ser encarade pode
              ser muito ruim para muita gente. Em algumas festas tivemos relatos
              de pessoas que se sentiram "violadas” pelo olhar fixo de alguém e
              queremos conscientizar, principalmente os homens cis, dessa
              experiência, porque muitos nunca nem pensaram a respeito.
            </p>
          </AlertDescription>
        </Alert>
      </>

      <Separator />

      <>
        <h4>🥡 A Positiv não é marmitaria 🥡</h4>
        <p>Nós fazemos uma festa sex- e body-Positiv.</p>
        <p>
          Diferente de uma casa de swing,{" "}
          <strong>não há lugares privativos pra transar</strong>.
        </p>
        <p>
          A ideia da festa é justamente normalizar a nudez, o sexo, e a
          sexualidade. Sexo não é tabu.
        </p>
        <p>
          Sabemos que nem todos são exibicionistas (e até existem uns cantos
          mais escondidinhos), porém é importante saber que nessa festa só há
          privacidade nos banheiros.
        </p>
        <p>
          "Ah, mas eu tenho vergonha de transar com outras pessoas vendo".
          Então, talvez, a Positiv não seja para você, ou você pode ajustar suas
          expectativas para simplesmente não transar na festa.
        </p>
        <p>
          “Ah, encontrei uma pessoa legal na festa e vou levá-la pra casa”:{" "}
          <b>por favor, não</b>. Se você quiser chamá-la para um rolê depois que
          tudo acabar, beleza. Não tirem as pessoas da festa — privando-as de
          outras experiências — para ter um espaço a sós com você.
        </p>
        <p>
          Isso é mal-visto pois não somos uma marmitaria, uma festa agenciadora
          de casais e trisais, que saem do público para curtir seu momento no
          sigilo. Somos uma exaltação do público, do compartilhado, e da beleza
          que é a variedade de pessoas.
        </p>
        <p>Respeito, por favor.</p>
      </>

      <Separator />

      <>
        <h4>😷 Proteção e saúde 😷</h4>
        <p>
          <b>Camisinha sempre e exames atualizados.</b>
        </p>
        <p>
          Recomendamos o uso de preservativos para<u>qualquer</u>
          interação sexual.
        </p>
        <p>
          Nas interações pênis/vagina e pênis/ânus — indepentente dos materiais
          —, a camisinha é completamente{" "}
          <strong>
            <u>obrigatória</u>
          </strong>
          e <strong>não tem conversa</strong> — qualquer problema com essa regra
          pode incorrer em ações legais (isso, polícia te levando seminu do
          motel porque você tirou a camisinha durante a transa).
        </p>
        <p>
          A gente sempre pede para que casais usem camisinha mesmo se transem
          sem em casa, porém quase nunca os casais o fazem… Por favor, se for um
          casal, respeite nossa regra.
        </p>
        <p>
          <strong>Recomendamos</strong>o uso de luvas (ou camisinhas) para
          interações que envolvam mãos, e dental dams ou camisinhas cortadas
          para sexo oral.
        </p>
        <p>
          Não fazemos distinção: use a camisinha que preferir, seja ela interna
          ou externa — aliás, esse é o melhor termo: “camisinha externa” ou
          “camisinha interna”.
        </p>
        <p>
          Ah, esperamos que todes possam fazer um exame de ISTs antes da festa —
          em SP você consegue fazer de graça, rapidinho, pelo SUS. Nós não
          pedimos exames, porque isso poderia ser discriminatório, mas indicamos
          que todes façam seus controles regularmente.
        </p>

        <Alert className="flex flex-col gap-4">
          <AlertTitle>🍆 A capa pode escapar... 🍆</AlertTitle>
          <AlertDescription className="flex flex-col gap-4">
            <p>
              Às vezes, a camisinha escapa — sim, aconteceu, acontece,
              acontecerá.
            </p>
            <p>
              O que a gente espera de você: pare TUDO o que estiver acontecendo
              e notifique as pessoas ao seu redor do que rolou. É um simples
              “olha, a camisinha escapou, ela tá aqui, vou colocar aqui do lado
              e pegar outra”.
            </p>
            <p>
              Se a camisinha escapou dentro da pessoa, a conduta é a mesma, e
              vale o reforço na importância de testes de IST e, dependendo do
              caso, a famosa pílula do dia seguinte.
            </p>
            <p>
              Acidentes acontecem; o que a gente quer é evitar mal-entendidos ou
              situações que podem gerar stress (como alguém achar que você tirou
              a camisinha no meio do sexo, o tal do stealthing, que é CRIME).
            </p>
            <p>
              Numa suruba, você é tão responsável pelo seu corpo quanto pelos
              corpos de quem transa.
            </p>
          </AlertDescription>
        </Alert>
      </>

      <Separator />

      <>
        <h4>📸 Sem celular e sem fotos 📸</h4>
        <p>
          Usar o celular e tirar fotos nas áreas do evento é{" "}
          <b>expressamente proibido</b>.
        </p>
        <p>O acesso ao celular só é permitido na garagem da suíte.</p>

        <ul className="list-disc list-inside">
          <li>“Ah mas eu quero tirar selfies durante a festa”: não;</li>
          <li>
            “Ah mas eu quero fazer umas fotos trepando com meu crush”: não;
          </li>
          <li>“Ah mas”: não.</li>
        </ul>
      </>

      <Separator />

      <>
        <h4>💪 Experiência intensa 💪</h4>
        <p>
          Por mais que nossa mensagem seja de tranquilidade, aceitação e paz,
          sabemos que um evento como o nosso possa ser intenso demais para
          algumas pessoas.
        </p>
        <p>
          Portanto, perguntamos sempre: você está num bom lugar mental para
          participar de algo que vai <b>com certeza</b> desafiar sua zona de
          conforto?
        </p>
        <p>
          A Positiv pode ser transformadora — já ouvimos isso de pessoas
          participantes — mas também pode ativar vários gatilhos. Portanto,
          saiba que você poderá se expôr a inúmeras sensações e sentimentos.
          Exemplos:
        </p>
        <ul className="list-disc list-inside">
          <li>
            Durante a festa a música ambiente se mescla com o som de gemidos.
            Como você lida com isso?
          </li>
          <li>
            É possível que você esteja conversando tranquilamente e, de repente,
            comecem a transar ali do seu lado. E agora?
          </li>
          <li>
            Uma pessoa se aproximou de você, olhou em seus olhos, e perguntou se
            pode te dar um beijo. Você não quer. Como você age?
          </li>
        </ul>
        <p>
          Essas perguntas hipotéticas — porém baseadas em casos reais — podem
          criar cenários apocalípticos na mente de pessoas ansiosas, mas servem
          mais para uma autoanálise e uma reflexão do tipo: estou pronto para
          ser desafiade?
        </p>
      </>

      <Separator />

      <>
        <h4>🗑️ Não deixe rastros 🧼🫧</h4>
        <p>
          Nossa missão é deixar o espaço, no fim da festa, do mesmo jeito que o
          encontramos quando chegamos.
        </p>
        <p>
          {" "}
          A manutenção do ambiente é de responsabilidade de TODES — não só das
          pessoas administradoras
        </p>
        <h4>Limpeza</h4>
        <p>
          Esperamos das pessoas participantes que recolham seu próprio lixo —
          seja ele migalhas de comida que caíram no chão, uma embalagem de
          lubrificante que acabou, ou uma camisinha usada.
        </p>
        <p>
          A gente tá cansado de recolher camisinha usada no fim da festa. Sério.
        </p>
        <h4>Trouxe? Leve.</h4>
        <p>
          Primeiro: <b>não temos achados e perdidos</b>. Os itens esquecidos no
          espaço do evento <b>ficam no espaço do evento</b>.
        </p>
        <p>
          Segundo: suas coisas são de sua responsabilidade,{" "}
          <b>inclusive suas comidas e bebidas</b>. Levou à festa um delicioso
          bolo e sobrou um pedaço? <b>Leve embora</b>.
        </p>
        <p>
          A comida que não for retirada será <b>descartada</b>, e isso é
          péssimo. Fica nas mãos das pessoas administradoras a responsabilidade
          de organizar o espaço e a dor na consciência de jogar comida fora.
        </p>
        <p>
          Se você não pode levar sua comida embora, tome você mesme a decisão de
          descartá-la.
        </p>
      </>

      <Separator />

      <>
        <h4>🕺 Não somos uma balada 🪩</h4>
        <p>
          A palavra "festa" ou "evento" pode confundir algumas pessoas. Não
          somos uma balada — o evento é de dia, tem piscina, não tem música
          alta. É muito mais um picnic ou um churrasco com as pessoas amigas.
        </p>
        <p>
          Tenha isso em mente ao se inscrever — não somos nada parecidos com
          casas de swing ou festas liberais. Não tem pista de dança, nem drink
          que pisca.
        </p>
      </>
    </>
  )
}
