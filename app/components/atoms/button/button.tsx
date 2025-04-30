import {
  Button as ShadButton,
  type ButtonProps as ShadButtonProps,
} from "../../ui/button"
import { Link } from "../link/link"

export type ButtonProps = ShadButtonProps & {
  to?: string
  linkProps?: Omit<React.ComponentProps<typeof Link>, "to">
}

/** A subset of Shadcn Button that renders a Link if an href is present */
export const Button = ({ to, linkProps, ...props }: ButtonProps) => {
  if (to) {
    return (
      <ShadButton {...props} asChild>
        <Link variant="unstyled" to={to} {...linkProps}>
          {props.children}
        </Link>
      </ShadButton>
    )
  }

  return <ShadButton {...props} />
}
