import type { FC } from "react"
import { Link } from "react-router"
import Instagram from "~/assets/social/instagram.svg"
import { NewsDialog } from "../news-dialog/news-dialog"

const BUG_TRACKER_URL = "https://forms.gle/ys6W6W54YTcoBHrJA"

type FooterProps = { isThereAnyNews: boolean }
export const Footer: FC<FooterProps> = ({ isThereAnyNews }) => {
  return (
    <footer className="text-xs w-full p-3 bg-gray-100 border">
      <div className="px-4 md:px-6">
        <div className="grid grid-cols-1 text-muted-foreground lg:grid-cols-3  gap-4  justify-end items-end text-center">
          <p className="text-muted-foreground">
            © 2025 Positiv. Todos os direitos reservados.
          </p>
          <div>
            <NewsDialog isThereAnyNews={isThereAnyNews} />
            <div className="flex justify-center items-center space-x-4 text-black">
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
          <div>
            <p>
              Encontrou um bug?{" "}
              <Link to={BUG_TRACKER_URL}>Clique aqui e nos avise</Link>.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
