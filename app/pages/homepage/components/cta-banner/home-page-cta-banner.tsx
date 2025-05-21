import { Button } from "~/components/atoms/button/button"
import routes from "~/lib/paths"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"

const {
  auth: { LOGIN },
  dash: { DASHBOARD },
} = routes

export const HomePageCtaBanner = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
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
          {isLoggedIn ? (
            <Button size="lg" variant="secondary" to={DASHBOARD}>
              Veja os eventos
            </Button>
          ) : (
            <Button size="lg" variant="secondary" to={LOGIN}>
              Entrar e conferir
            </Button>
          )}
        </div>
      </div>
    </Section>
  )
}
