import { Img, Section } from "@react-email/components"
import { POSITIV_URL } from "~/lib/helpers/constants"

const logo = `${POSITIV_URL}brand/positiv-logo-colors.png`

export const EmailHeader = () => {
  return (
    <Section>
      <Img src={logo} alt="Positiv" width={300} className="m-auto my-4" />
    </Section>
  )
}
