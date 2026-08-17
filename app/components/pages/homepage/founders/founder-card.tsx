import Instagram from "~/assets/social/instagram.svg"
import { Button } from "~/components/atoms/button/button"
import type { FCC } from "~types/utils/utils.types"

type FounderCardProps = {
  name: string
  image: string
  alt: string
  pronounsLabel: string
  instagram: string
  instagramIconAlt: string
}

export const FounderCard: FCC<FounderCardProps> = ({
  image,
  alt,
  name,
  children,
  pronounsLabel,
  instagram,
  instagramIconAlt,
}) => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <img
        src={image}
        alt={alt}
        width={160}
        height={160}
        className="object-cover rounded-full"
      />
      <div className="flex flex-col gap-0">
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="text-sm text-muted-foreground">{pronounsLabel}</p>
      </div>

      <div className="text-muted-foreground text-center max-w-md flex flex-col gap-4">
        {children}
      </div>
      <div>
        <Button
          variant="ghost"
          linkProps={{ target: "_blank" }}
          to={`https://instagram.com/${instagram}`}
        >
          <img src={Instagram} alt={instagramIconAlt} width={25} />
        </Button>
      </div>
    </div>
  )
}
