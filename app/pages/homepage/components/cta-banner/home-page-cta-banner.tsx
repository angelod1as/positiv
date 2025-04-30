import { Button } from "~/components/atoms/button/button"
import routes from "~/lib/routes"
import { HomePageTitle } from "../home-title"

const {
  auth: { LOGIN },
} = routes

export const HomePageCtaBanner = () => {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-image text-white">
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
    </section>
  )
}
