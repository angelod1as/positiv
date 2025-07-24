import { Card, CardContent } from "~/components/ui/card"
import type { FCC } from "~types/utils.types"

type TestimonialCardProps = {
  title: string
}
export const TestimonialCard: FCC<TestimonialCardProps> = ({
  title,
  children,
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <p className="font-bold leading-none">{title}</p>
            <div className="text-muted-foreground flex flex-col gap-4">
              {children}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
