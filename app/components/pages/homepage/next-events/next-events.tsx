import { ArrowRightIcon } from "lucide-react"
import type { FC } from "react"
import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { homepageCopy } from "~/copy/homepage"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import routes from "~/lib/paths"
import type { Event } from "~types/database/entities.types"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"

const {
  auth: { LOGIN },
} = routes

const { nextEvents } = homepageCopy

type HomePageNextEventsProps = {
  events: Array<Event>
}
export const HomePageNextEvents: FC<HomePageNextEventsProps> = ({ events }) => {
  return (
    <Section>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 ">
          <HomePageTitle subtitle={nextEvents.subtitle}>
            {nextEvents.title}
          </HomePageTitle>

          <div className="flex lg:flex-row flex-col gap-8 items-stretch justify-center">
            {events.map(
              ({
                id,
                time_application_start,
                event_status,
                description,
                emoji,
                time_event_start,
                time_event_end,
                title,
                is_applied,
              }) => {
                const { date, time: startingTime } =
                  formatDateTime(time_event_start)
                const { time: endingTime } = formatDateTime(time_event_end)
                const { date: openDate } = formatDateTime(
                  time_application_start,
                )

                const isOpen = event_status === "Registration Open"

                return (
                  <Card
                    className="flex flex-col text-center flex-1 max-w-md"
                    key={id}
                  >
                    <CardHeader>
                      <div className="text-6xl mb-4">{emoji}</div>
                      <CardTitle>{title}</CardTitle>
                      <CardDescription>
                        {nextEvents.schedule(date, startingTime, endingTime)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-muted-foreground grow gap-4 flex flex-col items-center">
                      <p>{description}</p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                      {isOpen ? (
                        <p className="text-sm">
                          <Copy inline>{nextEvents.registrationOpen}</Copy>
                        </p>
                      ) : (
                        <p className="text-sm">
                          <Copy inline>{nextEvents.registrationOpensOn}</Copy>
                          <br /> {openDate}
                        </p>
                      )}
                      {is_applied ? (
                        <Button variant="outline" to={LOGIN}>
                          {nextEvents.alreadyApplied}
                        </Button>
                      ) : (
                        <Button to={LOGIN}>{nextEvents.apply}</Button>
                      )}
                    </CardFooter>
                  </Card>
                )
              },
            )}
          </div>
          <Button to={LOGIN} variant="outline" className="flex items-center">
            {nextEvents.learnMore} <ArrowRightIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Section>
  )
}
