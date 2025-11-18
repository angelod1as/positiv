import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"

const EventCardSkeleton = () => {
  return (
    <Card className="flex flex-col text-center flex-1 max-w-md animate-pulse">
      <CardHeader>
        {/* Emoji placeholder */}
        <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
        {/* Title placeholder */}
        <CardTitle>
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mx-auto" />
        </CardTitle>
        {/* Date/time placeholder */}
        <CardDescription>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto mt-2" />
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground grow gap-4 flex flex-col">
        {/* Description placeholders */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mx-auto" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6 mx-auto" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {/* Status text placeholder */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mx-auto" />
        {/* Button placeholder */}
        <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-full" />
      </CardFooter>
    </Card>
  )
}

export const HomePageNextEventsSkeleton = () => {
  return (
    <Section>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <HomePageTitle subtitle="Confira nossos próximos encontros e garanta sua participação.">
            Próximos Eventos
          </HomePageTitle>

          <div
            className="flex lg:flex-row flex-col gap-8 items-stretch justify-center"
            data-testid="homepage-next-events-skeleton"
            aria-busy="true"
            aria-live="polite"
          >
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>

          {/* CTA button placeholder */}
          <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-48 animate-pulse" />
        </div>
      </div>
    </Section>
  )
}
