import { GithubIcon } from "lucide-react"
import type { FC } from "react"
import Instagram from "~/assets/social/instagram.svg"
import { Link } from "~/components/atoms/link/link"
import type { ProfileWithRoles } from "~types/entities.types"
import { NewsDialog } from "../news-dialog/news-dialog"

const BUG_TRACKER_URL = "https://forms.gle/ys6W6W54YTcoBHrJA"

type FooterProps = { 
  isThereAnyNews: boolean
  currentProfile?: ProfileWithRoles | null
}
export const Footer: FC<FooterProps> = ({ isThereAnyNews, currentProfile }) => {
  return (
    <footer className="text-xs w-full p-3 bg-gray-100 border">
      <div className="px-4 md:px-6">
        <div className="grid grid-cols-1 text-muted-foreground lg:grid-cols-2  gap-4  justify-end items-start text-center">
          <div className="text-muted-foreground">
            <p>© 2025 Positiv. Todos os direitos reservados.</p>
            <p>
              Este website está em constante desenvolvimento por{" "}
              <Link target="_blank" to="https://www.angelodias.com.br">
                Angelo Dias
              </Link>
              .
            </p>
            <p className="flex gap-2 justify-center">
              Ele é Open Source e aceita colaborações.{" "}
              <Link
                target="_blank"
                to="https://github.com/angelod1as/positiv"
                className="flex items-center"
              >
                <GithubIcon />
                Visite nosso repositório.
              </Link>
            </p>
            <p>
              Encontrou um bug?{" "}
              <Link to={BUG_TRACKER_URL}>Clique aqui e nos avise</Link>.
            </p>
          </div>
          <div>
            <NewsDialog isThereAnyNews={isThereAnyNews} currentProfile={currentProfile} />
            <div className="flex justify-center items-center space-x-4">
              <Link
                target="_blank"
                to="https://instagram.com/positivparty"
                className="flex gap-2 items-center"
              >
                <img src={Instagram} alt="Instagram icon" width={20} /> Siga
                nosso instagram
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
