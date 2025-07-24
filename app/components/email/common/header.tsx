import { Img, Section } from "@react-email/components"
import { POSITIV_URL } from "~/lib/constants/constants"

const logo = `${POSITIV_URL}positiv-logo-colors.png`

export const EmailHeader = () => {
  return (
    <Section>
      <Img src={logo} alt="Positiv" width={300} className="m-auto my-4" />
    </Section>
  )
}
