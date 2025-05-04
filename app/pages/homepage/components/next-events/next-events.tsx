import { ArrowRightIcon } from "lucide-react"
import type { FC } from "react"
import { Button } from "~/components/atoms/button/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { formatDateTime } from "~/lib/helpers/format-date"
import routes from "~/lib/paths"
import type { EventStatus } from "~types/entities.types"
import type { HomePageViewEvent } from "../../fetch/get-next-events"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"
import { HomePageNextEventsSkeleton } from "./next-events-skeleton"

const {
  dash: {
    participant: { DASHBOARD },
  },
  auth: { LOGIN },
} = routes

type HomePageNextEventsProps = {
  events: Array<HomePageViewEvent> | undefined
}
export const HomePageNextEvents: FC<HomePageNextEventsProps> = ({ events }) => {
  if (!events) {
    return <HomePageNextEventsSkeleton />
  }

  return (
    <Section>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 ">
          <HomePageTitle
            subtitle="Confira nossos próximos encontros e garanta sua
              participação."
          >
            Próximos Eventos
          </HomePageTitle>

          <div className="flex lg:flex-row flex-col gap-8 items-stretch justify-center">
            {events.map(
              ({
                id,
                application_open_time,
                event_status,
                description,
                emoji,
                starting_time,
                ending_time,
                title,
              }) => {
                const { date, time: startingTime } =
                  formatDateTime(starting_time)
                const { time: endingTime } = formatDateTime(ending_time, {
                  showMinutes: true,
                })
                const { date: openDate } = formatDateTime(application_open_time)

                const status = event_status as EventStatus
                const isOpen = status === "Registration Open"

                return (
                  <Card className="flex flex-col text-center flex-1" key={id}>
                    <CardHeader>
                      <div className="text-6xl mb-4">{emoji}</div>
                      <CardTitle>{title}</CardTitle>
                      <CardDescription>
                        {date}, das {startingTime} às {endingTime}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-muted-foreground grow gap-4 flex flex-col">
                      <p>{description}</p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                      {isOpen ? (
                        <p className="text-sm">
                          <b>Inscrições abertas!</b>
                        </p>
                      ) : (
                        <p className="text-sm">
                          <b>Abertura das inscrições:</b>
                          <br /> {openDate}
                        </p>
                      )}
                      <Button to={LOGIN}>Participar</Button>
                    </CardFooter>
                  </Card>
                )
              },
            )}
          </div>
          <Button
            to={DASHBOARD}
            variant="outline"
            className="flex items-center"
          >
            Entre para saber mais <ArrowRightIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Section>
  )
}
