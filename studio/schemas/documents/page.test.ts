import { SanityClient } from "@sanity/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { pathsOf } from "../../test/errors"
import { validateDocumentOf } from "../../test/validate"

const page = {
  title: "Sobre",
  address: "/sobre",
}

type CountQuery = { fetch(query: string, params: object): Promise<number> }

function pagesAtAddress(count: number) {
  return vi
    .spyOn(SanityClient.prototype as unknown as CountQuery, "fetch")
    .mockResolvedValue(count)
}

async function addressErrors(address: unknown) {
  return (await validateDocumentOf("page", { ...page, address })).filter(
    (error) => error.path === "address",
  )
}

describe("page", () => {
  beforeEach(() => {
    pagesAtAddress(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("accepts a complete page", async () => {
    expect(await validateDocumentOf("page", page)).toEqual([])
  })

  it.each(["title", "address"])("requires the %s", async (field) => {
    const errors = await validateDocumentOf("page", {
      ...page,
      [field]: undefined,
    })

    expect(pathsOf(errors)).toContain(field)
  })

  describe("address", () => {
    it.each(["/", "/sobre", "/sobre/equipe", "/2026-verao", "/a/b/c"])(
      "accepts %s",
      async (address) => {
        expect(await addressErrors(address)).toEqual([])
      },
    )

    it.each([
      ["no leading slash", "sobre"],
      ["a trailing slash", "/sobre/"],
      ["an empty segment", "/sobre//equipe"],
      ["uppercase letters", "/Sobre"],
      ["accents", "/sobre/programação"],
      ["spaces", "/sobre nos"],
      ["underscores", "/sobre_nos"],
      ["a dot", "/sobre.html"],
      ["a query string", "/sobre?a=1"],
      ["a fragment", "/sobre#equipe"],
      ["a protocol-relative address", "//sobre"],
      ["a full URL", "https://positiv.com.br/sobre"],
    ])("rejects %s", async (_, address) => {
      expect(await addressErrors(address)).not.toEqual([])
    })

    it.each(["/admin", "/entrar", "/api/feedback", "/assets/logo", "/dev"])(
      "rejects %s, whose first segment belongs to the Platform",
      async (address) => {
        expect(await addressErrors(address)).not.toEqual([])
      },
    )

    it("allows a reserved word below the first segment", async () => {
      expect(await addressErrors("/sobre/admin")).toEqual([])
    })

    it("rejects an address another page already has", async () => {
      pagesAtAddress(1)

      expect(await addressErrors("/sobre")).not.toEqual([])
    })

    it("stops a second page from claiming /", async () => {
      pagesAtAddress(1)

      expect(await addressErrors("/")).not.toEqual([])
    })

    it("looks for other pages at the same address, not at this page's own versions", async () => {
      const fetch = pagesAtAddress(0)

      await validateDocumentOf("page", { ...page, _id: "drafts.page-sobre" })

      expect(fetch).toHaveBeenCalledWith(expect.any(String), {
        address: "/sobre",
        id: "page-sobre",
      })
    })
  })
})
