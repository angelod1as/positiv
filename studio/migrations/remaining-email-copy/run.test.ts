import { describe, expect, it, vi } from "vitest"

import { applicationMailContent } from "../../../app/copy/emails/application-mail"
import { paymentLinkMailContent } from "../../../app/copy/emails/payment-link"
import { EMAIL_TEMPLATES_ID } from "../../singletons"
import { run, type Store } from "./run"
import { emailCopy } from "./transform"

type Doc = Record<string, unknown>

function get(doc: Doc, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((value, key) => (value as Doc | undefined)?.[key], doc)
}

// An in-memory dataset that applies the store's writes the way the Content Lake
// does: createIfNotExists, then each setIfMissing in order, on dotted paths
// whose parent must already exist.
function memoryStore(initial: Doc | null) {
  let doc = initial
  const store: Store & { doc: () => Doc | null } = {
    doc: () => doc,
    current: vi.fn(async () => doc),
    fill: vi.fn(async (base, patches) => {
      const target: Doc = (doc ??= { ...base })
      for (const patch of patches) {
        for (const [path, value] of Object.entries(patch)) {
          const keys = path.split(".")
          const parent = keys
            .slice(0, -1)
            .reduce<Doc | undefined>((at, key) => at?.[key] as Doc, target)
          if (!parent) throw new Error(`No parent for ${path}`)
          const last = keys[keys.length - 1]
          if (parent[last] === undefined) parent[last] = value
        }
      }
    }),
  }
  return store
}

const productionToday = () => ({
  _id: EMAIL_TEMPLATES_ID,
  _type: "emailTemplates",
  paymentLink: { ...paymentLinkMailContent, heading: "Editado" },
})

describe("run", () => {
  it.each([
    ["no arguments", []],
    ["a flag without a value", ["--dataset"]],
    ["only --no-dry-run", ["--no-dry-run"]],
  ])("refuses %s, before connecting to any dataset", async (_, args) => {
    const connect = vi.fn(() => memoryStore(null))

    await expect(run(args, connect)).rejects.toThrow(/--dataset/)
    expect(connect).not.toHaveBeenCalled()
  })

  it("connects to the dataset it is given", async () => {
    const connect = vi.fn(() => memoryStore(null))

    await run(["--dataset", "development"], connect)

    expect(connect).toHaveBeenCalledWith("development")
  })

  it("dry-runs by default: lists the missing fields and writes nothing", async () => {
    const store = memoryStore(productionToday())

    const result = await run(["--dataset", "production"], () => store)

    expect(result.dryRun).toBe(true)
    expect(result.missing).toContain("application.subject")
    expect(result.missing).toContain("registrationLimit.closing")
    expect(result.missing).not.toContain("paymentLink.heading")
    expect(store.fill).not.toHaveBeenCalled()
  })

  it("fills every email's copy with --no-dry-run", async () => {
    const store = memoryStore(productionToday())

    await run(["--dataset", "production", "--no-dry-run"], () => store)

    for (const [email, content] of Object.entries(emailCopy)) {
      expect(store.doc()?.[email]).toEqual(content)
    }
  })

  it("never touches the payment link or a field an Editor already set", async () => {
    const store = memoryStore({
      ...productionToday(),
      application: { subject: "Assunto do Editor" },
    })

    const result = await run(
      ["--dataset", "production", "--no-dry-run"],
      () => store,
    )

    expect(result.missing).not.toContain("application.subject")
    expect(get(store.doc()!, "application.subject")).toBe("Assunto do Editor")
    expect(get(store.doc()!, "application.heading")).toBe(
      applicationMailContent.heading,
    )
    expect(get(store.doc()!, "paymentLink.heading")).toBe("Editado")
  })

  it("creates the singleton when the dataset has none", async () => {
    const store = memoryStore(null)

    await run(["--dataset", "development", "--no-dry-run"], () => store)

    expect(store.doc()).toMatchObject({
      _id: EMAIL_TEMPLATES_ID,
      _type: "emailTemplates",
      application: applicationMailContent,
    })
  })

  it("is a no-op the second time", async () => {
    const store = memoryStore(productionToday())
    const args = ["--dataset", "production", "--no-dry-run"]

    await run(args, () => store)
    const second = await run(args, () => store)

    expect(second.missing).toEqual([])
    expect(store.fill).toHaveBeenCalledTimes(1)
  })
})
