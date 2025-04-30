import { HeartIcon, SparklesIcon, UsersIcon } from "lucide-react"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"
import { AboutCard } from "./about-card"

export const HomePageAbout = () => {
  return (
    <Section hasBg>
      <div className="px-4 md:px-6 flex flex-col items-center">
        <div className="flex flex-col items-center justify-center gap-4 text-center max-w-(--breakpoint-xl)">
          <HomePageTitle>Como assim?</HomePageTitle>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12 pt-8">
            <AboutCard icon={<UsersIcon />} title="suruba não é bagunça">
              <p>
                Nossos eventos são tipo um <b>piquenique</b> ou <b>churras</b>{" "}
                entre amigues. <b>Não somos uma balada</b>.
              </p>
              <p>
                A diferença? Você pode ficar <b>pelade</b> e fazer <b>sexo</b>{" "}
                na boa, sem se esconder. É um encontro relax, focado em trocar
                ideia e estar juntes.
              </p>
            </AboutCard>
            <AboutCard icon={<HeartIcon />} title="afeto vs putaria">
              <p>
                Somos muito diferentes de sauna ou casa de swing. Priorizamos{" "}
                <b>segurança</b> e <b>consentimento</b>.
              </p>
              <p>
                <b>Não é sobre putaria, é sobre afeto.</b>
              </p>
              <p>
                Incentivamos a <b>conversa</b>, a <b>troca</b>. Sexo, só com{" "}
                <b>100% de consentimento</b> — <b>ninguém é obrigade a nada</b>.
              </p>
            </AboutCard>
            <AboutCard icon={<SparklesIcon />} title="para quem?">
              <p>
                Nossos encontros são para pessoas <b>não-monogâmicas</b> e{" "}
                <b>queer</b>.
              </p>
              <p>
                Criamos um espaço de <b>liberdade</b> e <b>exploração</b>, ideal
                para quem foge do tradicional.
              </p>
              <p>
                E, claro, nosso evento é para <b>maiores de 18 anos</b>.
              </p>
            </AboutCard>
          </div>
        </div>
      </div>
    </Section>
  )
}
