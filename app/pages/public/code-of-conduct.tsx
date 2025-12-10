import { getContext } from "~/business/auth/auth.server"
import { Link } from "~/components/atoms/link/link"
import type { Route } from "../public/+types/code-of-conduct"

export async function loader({ params, request }: Route.LoaderArgs) {
  const { currentUser } = await getContext(request, params)
  const isLoggedIn = !!currentUser?.id

  return {
    isLoggedIn,
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Código de Conduta" },
    { property: "og:title", content: "Código de Conduta" },
    {
      name: "description",
      content: "Código de conduta da Positiv",
    },
    {
      property: "og:description",
      content: "Código de conduta da Positiv",
    },
  ]
}

export default function CodeOfConduct() {
  return (
    <>
      <h1>Código de Conduta</h1>

      <p>
        Na Positiv, acreditamos que a celebração só existe plenamente quando
        todas as pessoas se sentem seguras, respeitadas e livres para viver a
        experiência que pretendemos propiciar. Por isso, assumimos o compromisso
        de construir e promover um ambiente inclusivo, acolhedor e livre de
        qualquer forma de violência.
      </p>

      <h2>
        1. Tolerância zero a assédio e abuso (incluindo preconceitos diversos)
      </h2>

      <p>
        Durante o evento e no grupo que antecede a ele, não serão toleradas
        atitudes de assédio, abuso, invasão de espaço pessoal, discriminação —
        racismo, machismo, LGBTfobia, gordofobia e qualquer ação ou comentário
        que fira a existência de um indivíduo ou grupo — ou comportamentos que
        coloquem outra pessoa em situação de insegurança ou vulnerabilidade.
      </p>

      <p>Assédio inclui — mas não se limita a:</p>

      <ul>
        <li>Comentários indesejados de cunho sexual ou ofensivo</li>
        <li>Interações (virtuais ou não) sem consentimento</li>
        <li>Insistência de interações (sejam virtuais ou não)</li>
        <li>Tentativas de intimidar, coagir ou manipular.</li>
      </ul>

      <h2>2. Compromisso com um espaço seguro</h2>

      <p>Levamos a sério a criação de um espaço seguro para todes.</p>
      <p>
        Por esse motivo,{" "}
        <b>
          a presença de pessoas que gerem incômodo, desrespeito ou que não
          representem segurança para o coletivo será inviabilizada.
        </b>
      </p>
      <p>Isso significa que:</p>

      <ul>
        <li>
          A equipe pode advertir, intervir ou retirar do evento ou do grupo
          qualquer pessoa cujo comportamento viole este código.
        </li>
        <li>
          A decisão dos administradores da Positiv é soberana e tem como
          objetivo proteger o bem-estar coletivo.
        </li>
      </ul>

      <p>
        Histórias de assédio que ocorrem <b>fora</b> do nosso ecossistema
        (evento ou grupo gerenciado pela Positiv) e que geram desconfortos,
        inseguranças e/ou incômodos aos participantes da festa, poderão incorrer
        na não aceitação da pessoa em nossos eventos, porque ferem, justamente,
        a segurança coletiva.
      </p>

      <h2>3. Canal oficial para denúncias</h2>

      <p>
        Temos um canal ativo e permanente para qualquer denúncia, relato ou
        pedido de apoio: <b>nosso WhatsApp oficial:</b>{" "}
        <Link to="https://wa.me/5511945970336" target="_blank">
          (11) 94597-0336
        </Link>
      </p>

      <p>
        Se você passar por alguma situação de incômodo, testemunhar algo
        suspeito ou simplesmente sentir que algo não está certo,{" "}
        <b>fale com a nossa equipe imediatamente</b>. Sua segurança é
        prioridade.
      </p>

      <h2>4. Consentimento é regra</h2>

      <p>Na Positiv:</p>

      <ul>
        <li>Uma pessoa só tem interesse se ela disser claramente que tem.</li>
        <li>“Talvez” é “não”.</li>
        <li>
          Pessoas alcoolizadas ou com consciência alterada <b>não podem</b>{" "}
          consentir.
        </li>
      </ul>

      <p>Perguntar é sexy. Respeitar limites é obrigatório.</p>

      <h2>5. Cuidamos uns dos outros</h2>

      <p>
        Se algo parecer errado, ajude. Se não se sentir confortável para
        intervir, chame alguém da nossa equipe.
      </p>
      <p>
        Segurança é responsabilidade coletiva — mas a responsabilidade de agir é
        nossa também.
      </p>
    </>
  )
}
