import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"
import { TestimonialCard } from "./testimonial-card"

export const HomePageTestimonials = () => {
  return (
    <Section>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <HomePageTitle subtitle="Experiências reais de algumas pessoas que participaram dos nossos eventos.">
            Quem vai, nunca esquece
          </HomePageTitle>

          <div className="grid grid-cols-1 gap-6 md:gap-8 pt-8 max-w-3xl">
            <TestimonialCard title="A., 32">
              <p>
                "Participei do meu primeiro evento da Positiv com muita
                insegurança, mas a organização foi impecável. O ambiente
                respeitoso e as regras claras me fizeram sentir segura o tempo
                todo. Foi uma experiência libertadora que me ajudou a
                redescobrir minha sexualidade."
              </p>
            </TestimonialCard>
            <TestimonialCard title="C., 40">
              <p>
                "Como casal, estávamos buscando novas experiências para
                apimentar nosso relacionamento. Os eventos da Positiv superaram
                nossas expectativas. A seleção criteriosa dos participantes e a
                organização impecável criaram um ambiente perfeito para
                explorarmos juntos."
              </p>
            </TestimonialCard>
            <TestimonialCard title="P., 28">
              <p>
                "O processo de seleção é rigoroso, mas vale a pena. Nos eventos
                da Positiv, encontrei pessoas com a mesma mentalidade, abertas a
                novas experiências e respeitosas. A atmosfera é de liberdade
                total, mas com limites claros que todos respeitam."
              </p>
            </TestimonialCard>
          </div>
        </div>
      </div>
    </Section>
  )
}
