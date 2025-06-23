import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card"

export const HomePageNextEventsSkeleton = () => {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-white  animate-pulse">
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            {/* Skeleton for Title */}
            <div className="h-9 bg-gray-300 rounded w-64 md:w-80 mx-auto mb-4" />
            {/* Skeleton for Description */}
            <div className="h-6 bg-gray-300 rounded w-4/5 md:w-2/3 mx-auto" />
            <div className="h-6 bg-gray-300 rounded w-3/5 md:w-1/2 mx-auto" />
          </div>
          {/* Skeleton for the two cards */}
          <div className="flex md:flex-row flex-col gap-8 items-stretch justify-center w-full max-w-4xl">
            {/* Skeleton Card 1 */}
            <Card className="flex flex-col items-center text-center flex-1">
              <CardHeader className="w-full">
                {/* Skeleton for Emoji */}
                <div className="h-16 w-16 bg-gray-300 rounded-full mx-auto mb-4" />
                {/* Skeleton for Card Title */}
                <div className="h-7 bg-gray-300 rounded w-3/4 mx-auto mb-2" />
                {/* Skeleton for Card Description (Date, Time, etc.) */}
                <div className="h-5 bg-gray-300 rounded w-1/2 mx-auto" />
              </CardHeader>
              <CardContent className="text-muted-foreground grow gap-4 flex flex-col w-full px-6">
                {/* Skeleton for Paragraph 1 */}
                <div className="h-5 bg-gray-300 rounded w-full" />
                <div className="h-5 bg-gray-300 rounded w-11/12" />
                {/* Skeleton for Paragraph 2 */}
                <div className="h-5 bg-gray-300 rounded w-2/3" />
              </CardContent>
              <CardFooter className="w-full px-6 pb-6">
                {/* Skeleton for Button */}
                <div className="h-10 bg-gray-300 rounded w-full" />
              </CardFooter>
            </Card>

            {/* Skeleton Card 2 */}
            <Card className="flex flex-col items-center text-center flex-1">
              <CardHeader className="w-full">
                {/* Skeleton for Emoji */}
                <div className="h-16 w-16 bg-gray-300 rounded-full mx-auto mb-4" />
                {/* Skeleton for Card Title */}
                <div className="h-7 bg-gray-300 rounded w-3/4 mx-auto mb-2" />
                {/* Skeleton for Card Description */}
                <div className="h-5 bg-gray-300 rounded w-1/2 mx-auto" />
              </CardHeader>
              <CardContent className="text-muted-foreground grow gap-4 flex flex-col w-full px-6">
                {/* Skeleton for Paragraph 1 */}
                <div className="h-5 bg-gray-300 rounded w-full" />
                <div className="h-5 bg-gray-300 rounded w-11/12" />
                {/* Skeleton for Paragraph 2 */}
                <div className="h-5 bg-gray-300 rounded w-2/3" />
              </CardContent>
              <CardFooter className="w-full px-6 pb-6">
                {/* Skeleton for Button */}
                <div className="h-10 bg-gray-300 rounded w-full" />
              </CardFooter>
            </Card>
          </div>
          {/* Skeleton for the "See More" button */}
          <div className="h-10 bg-gray-300 rounded w-36 mt-8 mx-auto" />
        </div>
      </div>
    </section>
  )
}
