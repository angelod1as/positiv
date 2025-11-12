import { describe, expect, it } from 'vitest'
import { ORIENTATIONS, POSITIV_WHATSAPP } from './constants'

describe('ORIENTATIONS', () => {
  it('should contain Lésbica as an orientation option', () => {
    expect(ORIENTATIONS).toContain('Lésbica')
  })

  it('should not contain Sapatão as an orientation option', () => {
    expect(ORIENTATIONS).not.toContain('Sapatão')
  })
})

describe('POSITIV_WHATSAPP', () => {
  it('should be defined', () => {
    expect(POSITIV_WHATSAPP).toBeDefined()
  })

  it('should have the correct WhatsApp phone number', () => {
    expect(POSITIV_WHATSAPP).toBe('5511945970336')
  })

  it('should be a string', () => {
    expect(typeof POSITIV_WHATSAPP).toBe('string')
  })

  it('should match Brazilian phone format', () => {
    expect(POSITIV_WHATSAPP).toMatch(/^55\d{11}$/)
  })
})