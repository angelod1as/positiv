import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  type TailwindConfig,
} from "@react-email/components"
import type { FC, ReactNode } from "react"
import { EmailFooter } from "./footer"
import { EmailHeader } from "./header"

const tailwindConfig: TailwindConfig = {
  theme: {
    extend: {
      colors: {
        lightgreen: "#00ffd3",
        green: "#00dd87",
        blue: "#4a75d2",
        purple: "#bf03c3",
        red: "#b7002d",
        yellow: "#ece010",
      },
    },
    fontSize: {
      xs: ["12px", { lineHeight: "16px" }],
      sm: ["14px", { lineHeight: "20px" }],
      base: ["16px", { lineHeight: "24px" }],
      lg: ["18px", { lineHeight: "28px" }],
      xl: ["20px", { lineHeight: "28px" }],
      "2xl": ["24px", { lineHeight: "32px" }],
      "3xl": ["30px", { lineHeight: "36px" }],
      "4xl": ["36px", { lineHeight: "36px" }],
      "5xl": ["48px", { lineHeight: "1" }],
      "6xl": ["60px", { lineHeight: "1" }],
      "7xl": ["72px", { lineHeight: "1" }],
      "8xl": ["96px", { lineHeight: "1" }],
      "9xl": ["144px", { lineHeight: "1" }],
    },
    spacing: {
      px: "1px",
      0: "0",
      0.5: "2px",
      1: "4px",
      1.5: "6px",
      2: "8px",
      2.5: "10px",
      3: "12px",
      3.5: "14px",
      4: "16px",
      5: "20px",
      6: "24px",
      7: "28px",
      8: "32px",
      9: "36px",
      10: "40px",
      11: "44px",
      12: "48px",
      14: "56px",
      16: "64px",
      20: "80px",
      24: "96px",
      28: "112px",
      32: "128px",
      36: "144px",
      40: "160px",
      44: "176px",
      48: "192px",
      52: "208px",
      56: "224px",
      60: "240px",
      64: "256px",
      72: "288px",
      80: "320px",
      96: "384px",
    },
  },
}

type EmailWrapperProps = {
  children: ReactNode
  pageTitle: string
  previewText: string
}

export const EmailWrapper: FC<EmailWrapperProps> = ({
  children,
  pageTitle,
  previewText,
}) => {
  return (
    <Html lang="pt-BR">
      <Tailwind config={tailwindConfig}>
        <>
          <Head>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>{`${pageTitle} - Positiv Party`}</title>
            <Font
              fontFamily="Nunito"
              fallbackFontFamily="Verdana"
              webFont={{
                url: "https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshdTo3j6zbXWjgevT5.woff2",
                format: "woff2",
              }}
              fontWeight={400}
              fontStyle="normal"
            />
            <Font
              fontFamily="Nunito"
              fallbackFontFamily="Verdana"
              webFont={{
                url: "https://fonts.gstatic.com/s/nunito/v26/XRXW3I6Li01BKofiOc5wtlZ2di8HDLshZgY9Y3E.woff2",
                format: "woff2",
              }}
              fontWeight={700}
              fontStyle="normal"
            />
          </Head>
          <Preview>{previewText}</Preview>
          <Body className="bg-black bg-no-repeat bg-positiv-gradient font-sans min-h-screen">
            <Container className="bg-white max-w-3xl my-8 shadow-lg">
              <Container className="max-w-md p-4">
                <EmailHeader />
                <Section>{children}</Section>
                <EmailFooter />
              </Container>
            </Container>
          </Body>
        </>
      </Tailwind>
    </Html>
  )
}
