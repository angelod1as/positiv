import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

type Rgb = [number, number, number]

const css = readFileSync(join(__dirname, 'app.css'), 'utf8')

const themeBlock = (selector: string): string => {
  const blocks = [...css.matchAll(/(^|\n)([^\n{]+)\{([^}]*)\}/g)]
  const block = blocks.find(
    ([, , head, body]) => head.trim() === selector && body.includes('--background:'),
  )
  if (!block) throw new Error(`No theme block for ${selector}`)
  return block[3]
}

const token = (block: string, name: string): string => {
  const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`Missing --${name}`)
  return match[1].trim()
}

const oklchToLinearRgb = (l: number, c: number, h: number): Rgb => {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp,
    -1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp,
    -0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp,
  ].map((v) => Math.min(1, Math.max(0, v))) as Rgb
}

const parseColor = (value: string): Rgb => {
  const match = value.match(/^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/)
  if (!match) throw new Error(`Unsupported color ${value}`)
  return oklchToLinearRgb(Number(match[1]), Number(match[2]), Number(match[3]))
}

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b

const contrast = (x: Rgb, y: Rgb) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p)
  return (hi + 0.05) / (lo + 0.05)
}

const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
}

const simulate = (rgb: Rgb, kind: keyof typeof MACHADO): Rgb =>
  MACHADO[kind].map((row) =>
    Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])),
  ) as Rgb

const toOklab = ([r, g, b]: Rgb): Rgb => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

const deltaE = (x: Rgb, y: Rgb) => {
  const [p, q] = [toOklab(x), toOklab(y)]
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) * 100
}

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `chart-${n}`)

describe.each([
  { theme: 'light', selector: ':root' },
  { theme: 'dark', selector: '.dark' },
])('chart palette, $theme theme', ({ selector }) => {
  const block = themeBlock(selector)
  const surface = parseColor(token(block, 'background'))
  const card = parseColor(token(block, 'card'))
  const slots = SLOTS.map((name) => ({ name, color: parseColor(token(block, name)) }))
  const neighbours = slots.slice(1).map((next, i) => ({ name: slots[i].name, a: slots[i].color, b: next.color }))

  it.each([...SLOTS, 'chart-highlight'])('keeps --%s at 3:1 against background and card', (name) => {
    const color = parseColor(token(block, name))
    expect(contrast(color, surface)).toBeGreaterThanOrEqual(3)
    expect(contrast(color, card)).toBeGreaterThanOrEqual(3)
  })

  it.each(neighbours)('tells --$name from its next slot with full color vision', ({ a, b }) => {
    expect(deltaE(a, b)).toBeGreaterThanOrEqual(15)
  })

  it.each(neighbours)('tells --$name from its next slot under protanopia and deuteranopia', ({ a, b }) => {
    expect(deltaE(simulate(a, 'protan'), simulate(b, 'protan'))).toBeGreaterThanOrEqual(8)
    expect(deltaE(simulate(a, 'deutan'), simulate(b, 'deutan'))).toBeGreaterThanOrEqual(8)
  })

  it('keeps the highlight apart from every slot', () => {
    const highlight = parseColor(token(block, 'chart-highlight'))
    for (const slot of slots) {
      expect(deltaE(highlight, slot.color)).toBeGreaterThanOrEqual(15)
    }
  })
})
