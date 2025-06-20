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
import { formatDateTime } from "~/lib/helpers/format-date-time"
import routes from "~/lib/paths"
import type { ViewEvent } from "~types/entities.types"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"

const {
  auth: { LOGIN },
} = routes

type HomePageNextEventsProps = {
  events: Array<ViewEvent>
}
export const HomePageNextEvents: FC<HomePageNextEventsProps> = ({ events }) => {
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
                      {is_applied ? (
                        <Button variant="outline" to={LOGIN}>
                          Já inscrite!
                        </Button>
                      ) : (
                        <Button to={LOGIN}>Participar</Button>
                      )}
                    </CardFooter>
                  </Card>
                )
              },
            )}
          </div>
          <Button to={LOGIN} variant="outline" className="flex items-center">
            Entre para saber mais <ArrowRightIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Section>
  )
}
