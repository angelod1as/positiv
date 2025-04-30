import Angelo from "~/assets/pictures/angelo.jpg"
import Julia from "~/assets/pictures/julia.jpg"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"
import { FounderCard } from "./founder-card"

export const HomePageFounders = () => {
  return (
    <Section>
      <div className="px-4 md:px-6 flex flex-col items-center">
        <div className="flex flex-col items-center justify-center space-y-4 text-center max-w-(--breakpoint-lg)">
          <HomePageTitle>Quem faz a Positiv?</HomePageTitle>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12 pt-8">
            <FounderCard
              image={Julia}
              name="Julia Fernandez"
              alt=""
              pronouns="ela/dela"
              instagram="ju.z.fernandez"
            >
              <p>
                Safofa de marca maior, gosta de todas as identidades de gênero e
                orientações sexuais, mas se identifica como demissexual. Vive a
                não monogamia desde 2009 e a cada dia gosta mais da sua versão
                atual, conectada com a Não Monogamia Política.
              </p>
              <p>
                Para ela, os eventos são, ao mesmo tempo, sua Pasárgada e a
                injeção de fé humanidade que a faz querer continuar a criar
                espaços seguros, de acolhimento e de muito amor.
              </p>
            </FounderCard>
            <FounderCard
              image={Angelo}
              name="Angelo Dias"
              alt=""
              pronouns="ele/dele"
              instagram="oicronofobico"
            >
              <p>
                Programador, designer e escritor, Angelo vive ativamente a
                não-monogamia e anarquia relacional desde 2017. Sonha em colocar{" "}
                <i>organizador de suruba</i> no Linkedin, é um nerdola que acha
                Star Trek melhor que Star Wars, e encontrou nesse tipo de evento
                um modo seguro de explorar sua sexualidade — e se juntou à Julia
                para provê-lo para outras pessoas.
              </p>
            </FounderCard>
          </div>
        </div>
      </div>
    </Section>
  )
}
