import { eventListCopy } from "~/copy/events"
import { EventCardSkeleton } from "../event-card/event-card-skeleton"

export const EventListSkeleton = () => {
  return (
    <div data-testid="event-list-skeleton" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-4">
        <h2>{eventListCopy.appliedHeading}</h2>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
          <EventCardSkeleton />
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-8">
        <h2>{eventListCopy.availableHeading}</h2>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      </div>
    </div>
  )
}
