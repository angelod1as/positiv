import { describe, expect, it } from 'vitest'
import { DASHBOARD_URL, ORIENTATIONS, POSITIV_URL, POSITIV_WHATSAPP } from './constants'

describe('ORIENTATIONS', () => {
  it('should contain Lésbica as an orientation option', () => {
    expect(ORIENTATIONS).toContain('Lésbica')
  })

  it('should not contain Sapatão as an orientation option', () => {
    expect(ORIENTATIONS).not.toContain('Sapatão')
  })
})

describe('URL constants', () => {
  it('should not contain double slashes in paths', () => {
    expect(DASHBOARD_URL).not.toMatch(/https?:\/\/[^/]+\/\//)
  })

  it('DASHBOARD_URL should resolve to the correct URL', () => {
    expect(DASHBOARD_URL).toBe(`${POSITIV_URL}dashboard`)
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