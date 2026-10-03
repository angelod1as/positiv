import type { PageSection } from "~/business/cms/page.schema"

type ImageSectionProps = {
  content: Extract<PageSection, { _type: "imageSection" }>
}

export const ImageSection = ({ content }: ImageSectionProps) => {
  const { image, caption } = content

  return (
    <section className="w-full px-4 py-8 md:px-6">
      <figure className="mx-auto flex max-w-5xl flex-col items-center gap-2">
        <img
          src={image.url}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          className="h-auto max-w-full rounded-lg"
        />
        {caption && (
          <figcaption className="text-sm text-muted-foreground">
            {caption}
          </figcaption>
        )}
      </figure>
    </section>
  )
}
