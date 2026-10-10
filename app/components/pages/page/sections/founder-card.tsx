import Instagram from "~/assets/social/instagram.svg"
import type { PageImage } from "~/business/cms/content.schema"
import { Button } from "~/components/atoms/button/button"
import type { FCC } from "~types/utils/utils.types"
import { useOverlay } from "../overlay/overlay-context"

type FounderCardProps = {
  personId: string
  name: string
  photo: PageImage
  pronounsLabel: string
  instagram: string
  instagramIconAlt: string
}

export const FounderCard: FCC<FounderCardProps> = ({
  personId,
  photo,
  name,
  children,
  pronounsLabel,
  instagram,
  instagramIconAlt,
}) => {
  const overlay = useOverlay()
  const target = (path: string) =>
    overlay?.dataAttribute({ type: "person", id: personId, path })

  return (
    <div className="flex flex-col items-center space-y-4">
      <img
        src={photo.url}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        className="size-40 object-cover rounded-full"
        data-sanity={target("photo")}
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
          data-sanity={target("instagram")}
        >
          <img src={Instagram} alt={instagramIconAlt} width={25} />
        </Button>
      </div>
    </div>
  )
}
