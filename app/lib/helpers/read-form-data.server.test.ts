import { describe, expect, it } from "vitest"

import { readFormData } from "./read-form-data.server"

function post(contentType: string | null, body: string) {
  const headers = new Headers()
  if (contentType !== null) headers.set("Content-Type", contentType)
  return new Request("http://localhost/", { method: "POST", headers, body })
}

async function rejection(promise: Promise<unknown>) {
  const thrown = await promise.then(
    () => undefined,
    (error: unknown) => error,
  )
  expect(thrown).toBeInstanceOf(Response)
  return thrown as Response
}

describe("readFormData", () => {
  it("answers a JSON body with 415", async () => {
    const response = await rejection(
      readFormData(post("application/json", '{"intent":"news-update"}')),
    )

    expect(response.status).toBe(415)
  })

  it("answers a body without a Content-Type with 415", async () => {
    const response = await rejection(readFormData(post(null, "intent=x")))

    expect(response.status).toBe(415)
  })

  it("answers a form body that cannot be parsed with 400", async () => {
    const response = await rejection(
      readFormData(post("multipart/form-data; boundary=abc", "garbage")),
    )

    expect(response.status).toBe(400)
  })

  it("reads a urlencoded form, whatever the case and charset", async () => {
    const formData = await readFormData(
      post("Application/X-WWW-Form-Urlencoded; charset=UTF-8", "intent=x"),
    )

    expect(formData.get("intent")).toBe("x")
  })

  it("reads a multipart form", async () => {
    const body = new FormData()
    body.set("intent", "x")
    const request = new Request("http://localhost/", { method: "POST", body })

    const formData = await readFormData(request)

    expect(formData.get("intent")).toBe("x")
  })
})
