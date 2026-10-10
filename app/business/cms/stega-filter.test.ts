import type {
  ContentSourceMap,
  FilterDefault,
  InitializedStegaConfig,
} from "@sanity/client/stega"
import { stegaClean, stegaEncodeSourceMap } from "@sanity/client/stega"
import { describe, expect, it } from "vitest"
import { stegaFilter } from "./stega-filter"

type FilterProps = Parameters<FilterDefault>[0]

function props(sourcePath: FilterProps["sourcePath"]): FilterProps {
  return {
    sourcePath,
    resultPath: sourcePath,
    value: "value",
    sourceDocument: { _id: "doc-1", _type: "page" },
    filterDefault: () => true,
  }
}

describe("stegaFilter", () => {
  it.each(["instagram", "alt", "videoTitle", "network", "address"])(
    "skips the non-display field %s",
    (field) => {
      expect(stegaFilter(props([field]))).toBe(false)
      expect(stegaFilter(props(["founders", { _key: "a", _index: 0 }, field]))).toBe(
        false,
      )
    },
  )

  it("skips the Page-level title but encodes nested titles", () => {
    expect(stegaFilter(props(["title"]))).toBe(false)
    expect(stegaFilter(props(["sections", { _key: "a", _index: 0 }, "title"]))).toBe(
      true,
    )
  })

  it("delegates every other field to filterDefault", () => {
    expect(stegaFilter(props(["name"]))).toBe(true)
    expect(stegaFilter(props(["label"]))).toBe(true)
    expect(stegaFilter({ ...props(["slug"]), filterDefault: () => false })).toBe(
      false,
    )
  })
})

const STUDIO_URL = "https://positiv.sanity.studio"

const result = {
  title: "Página inicial",
  address: "/",
  name: "Nana",
  instagram: "nana",
  videoTitle: "Vídeo de boas-vindas",
  network: "instagram",
  section: { title: "Nossa equipe", alt: "Foto da Nana" },
}

const paths = [
  "$['title']",
  "$['address']",
  "$['name']",
  "$['instagram']",
  "$['videoTitle']",
  "$['network']",
  "$['section']['title']",
  "$['section']['alt']",
]

const sourceMap: ContentSourceMap = {
  documents: [{ _id: "page-1", _type: "page" }],
  paths,
  mappings: Object.fromEntries(
    paths.map((path, index) => [
      path,
      { type: "value", source: { type: "documentValue", document: 0, path: index } },
    ]),
  ),
}

function encode(filter: FilterDefault | undefined) {
  const config = {
    enabled: true,
    studioUrl: STUDIO_URL,
    filter,
  } as unknown as InitializedStegaConfig
  return stegaEncodeSourceMap(result, sourceMap, config)
}

const isClean = (value: string) => value === stegaClean(value)

describe("stegaFilter end to end", () => {
  it("keeps every filtered field clean so the attribute, link or literal is safe", () => {
    const encoded = encode(stegaFilter)

    expect(isClean(encoded.title)).toBe(true)
    expect(isClean(encoded.address)).toBe(true)
    expect(isClean(encoded.instagram)).toBe(true)
    expect(isClean(encoded.videoTitle)).toBe(true)
    expect(isClean(encoded.network)).toBe(true)
    expect(isClean(encoded.section.alt)).toBe(true)
  })

  it("encodes display text so the overlay can trace it, and it round-trips clean", () => {
    const encoded = encode(stegaFilter)

    expect(isClean(encoded.name)).toBe(false)
    expect(isClean(encoded.section.title)).toBe(false)
    expect(stegaClean(encoded.name)).toBe("Nana")
    expect(stegaClean(encoded.section.title)).toBe("Nossa equipe")
  })

  it("is the reason the fields are clean: the default filter encodes them", () => {
    const withDefault = encode(undefined)

    expect(isClean(withDefault.instagram)).toBe(false)
    expect(isClean(withDefault.videoTitle)).toBe(false)
  })
})
