import { describe, expect, it } from "vitest"
import {
  classifySingleGender,
  classifySingleOrientation,
  classifySingleRaceColor,
} from "./demographics-utils"

describe("classifySingleGender", () => {
  it.each([
    ["Homem cis", "cis"],
    ["Mulher cis", "cis"],
    ["mulher CIS", "cis"],
    ["Homem trans", "trans"],
    ["Mulher trans", "trans"],
    ["Pessoa não binária", "trans"],
    ["pessoa nao binarie", "trans"],
    ["Pessoa agênera", "trans"],
    ["agênero", "trans"],
    ["agender", "trans"],
    ["Travesti", "trans"],
    ["cis trans", "trans"],
    ["Fluída", "other"],
    ["Transfeminina", "other"],
    ["Not Provided", "other"],
  ])("classifies %s as %s", (value, expected) => {
    expect(classifySingleGender(value)).toBe(expected)
  })
})

describe("classifySingleRaceColor", () => {
  it.each([
    ["Branca", "white"],
    ["branco. Mix.", "white"],
    ["Amarela", "yellow"],
    ["amarelo", "yellow"],
    ["Indígena", "indigenous"],
    ["indigena", "indigenous"],
    ["Preta", "black"],
    ["preto", "black"],
    ["Parda", "brown"],
    ["pardo", "brown"],
    ["Semitic", "other"],
    ["Not Provided", "other"],
  ])("classifies %s as %s", (value, expected) => {
    expect(classifySingleRaceColor(value)).toBe(expected)
  })
})

describe("classifySingleOrientation", () => {
  it.each([
    ["Bi", ["biPan"]],
    ["Pan", ["biPan"]],
    ["bissexual", ["biPan"]],
    ["Gay", ["homo"]],
    ["Lésbica", ["homo"]],
    ["lesbica", ["homo"]],
    ["Sapatão", ["homo"]],
    ["homo", ["homo"]],
    ["Hétero", ["straight"]],
    ["hetero", ["straight"]],
    ["Ace", ["aceDemi"]],
    ["Demi", ["aceDemi"]],
    ["bi demi", ["biPan", "aceDemi"]],
    ["gay bi", ["biPan"]],
    ["Queer", ["other"]],
  ])("classifies %s as %j", (value, expected) => {
    expect(classifySingleOrientation(value)).toEqual(expected)
  })
})
