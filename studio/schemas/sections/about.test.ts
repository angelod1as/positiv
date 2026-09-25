import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { paragraphs } from "../../test/portable-text"
import { validateValueOf } from "../../test/validate"

function card(key: string) {
  return {
    _type: "aboutCard",
    _key: key,
    title: "suruba não é bagunça",
    body: paragraphs("Nossos eventos são tipo um piquenique."),
  }
}

const about = {
  _type: "about",
  title: "Como assim?",
  cards: [card("a"), card("b"), card("c")],
}

describe("about", () => {
  it("accepts a title and three cards", async () => {
    expect(await validateValueOf("about", about)).toEqual([])
  })

  it("requires the title", async () => {
    const errors = await validateValueOf("about", {
      ...about,
      title: undefined,
    })

    expect(pathsOf(errors)).toContain("about.title")
  })

  it.each([
    ["two cards", [card("a"), card("b")]],
    ["four cards", [card("a"), card("b"), card("c"), card("d")]],
  ])("rejects %s", async (_, cards) => {
    const errors = await validateValueOf("about", { ...about, cards })

    expect(pathsOf(errors)).toContain("about.cards")
  })

  it.each(["title", "body"])("requires each card's %s", async (field) => {
    const errors = await validateValueOf("about", {
      ...about,
      cards: [{ ...card("a"), [field]: undefined }, card("b"), card("c")],
    })

    expect(pathsOf(errors)).toContain(`about.cards.a.${field}`)
  })
})
