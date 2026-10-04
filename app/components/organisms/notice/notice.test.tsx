import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { siteSettingsSchema } from "~/business/cms/site-settings.schema"
import { noticeCopy } from "~/copy/layout"
import { paragraph } from "~/test/page-documents"
import { siteSettingsDocument } from "~/test/site-settings-documents"
import { render, screen } from "~/test/test-utils"
import { Notice } from "./notice"

const noticeOf = (text: string) =>
  siteSettingsSchema.parse(siteSettingsDocument({ notice: paragraph(text) }))
    .notice

const dismiss = () =>
  userEvent.click(screen.getByRole("button", { name: noticeCopy.dismiss }))

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("Notice", () => {
  it("renders nothing when there is no Notice", () => {
    const { container } = render(
      <Notice notice={null} editorialSystemUnavailable={false} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("renders the Notice from the Site Settings", async () => {
    render(
      <Notice
        notice={noticeOf("Inscrições abertas!")}
        editorialSystemUnavailable={false}
      />,
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Inscrições abertas!",
    )
  })

  it("stays hidden once dismissed", async () => {
    const notice = noticeOf("Inscrições abertas!")
    const { unmount } = render(
      <Notice notice={notice} editorialSystemUnavailable={false} />,
    )

    await screen.findByRole("alert")
    await dismiss()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    unmount()
    render(<Notice notice={notice} editorialSystemUnavailable={false} />)

    await Promise.resolve()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows again when an Editor changes the Notice", async () => {
    const { unmount } = render(
      <Notice
        notice={noticeOf("Inscrições abertas!")}
        editorialSystemUnavailable={false}
      />,
    )
    await screen.findByRole("alert")
    await dismiss()
    unmount()

    render(
      <Notice
        notice={noticeOf("Inscrições encerradas.")}
        editorialSystemUnavailable={false}
      />,
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Inscrições encerradas.",
    )
  })

  it("still renders and dismisses when localStorage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })

    render(
      <Notice
        notice={noticeOf("Inscrições abertas!")}
        editorialSystemUnavailable={false}
      />,
    )

    await screen.findByRole("alert")
    await dismiss()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  describe("when the editorial system is unavailable", () => {
    it("says so, and cannot be dismissed", () => {
      render(<Notice notice={null} editorialSystemUnavailable />)

      expect(screen.getByRole("alert")).toHaveTextContent(
        noticeCopy.editorialSystemUnavailable,
      )
      expect(
        screen.queryByRole("button", { name: noticeCopy.dismiss }),
      ).not.toBeInTheDocument()
    })
  })
})
