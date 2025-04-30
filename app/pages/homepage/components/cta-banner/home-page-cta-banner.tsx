import { Button } from "~/components/atoms/button/button"
import routes from "~/lib/paths"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"

const {
  auth: { LOGIN },
} = routes

export const HomePageCtaBanner = () => {
  return (
    <Section hasBg>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <HomePageTitle>Não perca nossos próximos eventos</HomePageTitle>
            <p className="mx-auto max-w-[700px] md:text-xl">
              Faça login agora, se inscreva para o próximo evento, ou seja
              lembrade por quando novas inscrições abrirem
            </p>
          </div>
          {/* TODO: Variant: inverted? */}
          <Button size="lg" variant="secondary" to={LOGIN}>
            Entrar
          </Button>
        </div>
      </div>
    </Section>
  )
}
