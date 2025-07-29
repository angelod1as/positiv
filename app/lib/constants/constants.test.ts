import { describe, expect, it } from 'vitest'
import { ORIENTATIONS } from './constants'

describe('ORIENTATIONS', () => {
  it('should contain Lésbica as an orientation option', () => {
    expect(ORIENTATIONS).toContain('Lésbica')
  })

  it('should not contain Sapatão as an orientation option', () => {
    expect(ORIENTATIONS).not.toContain('Sapatão')
  })
})