import { describe, expect, it } from 'vitest'
import {
  formatParticipantNameForGoogleContacts,
  generateGoogleContactsUrl,
  type ProfileForGoogleContacts,
} from './google-contacts'

describe('Google Contacts Helper', () => {
  describe('formatParticipantNameForGoogleContacts', () => {
    it('should format CIS participant with social name', () => {
      const profile: ProfileForGoogleContacts = {
        social_name: 'João',
        full_name: 'João Silva',
        gender: ['Homem cis'],
        pronouns: ['ele/dele'],
      }

      const result = formatParticipantNameForGoogleContacts(profile)
      expect(result).toBe('João (João Silva) HC (ele/dele) Positiv')
    })

    it('should format CIS participant without social name', () => {
      const profile: ProfileForGoogleContacts = {
        social_name: null,
        full_name: 'Maria Santos',
        gender: ['Mulher cis'],
        pronouns: ['ela/dela'],
      }

      const result = formatParticipantNameForGoogleContacts(profile)
      expect(result).toBe('Maria Santos MC (ela/dela) Positiv')
    })

    it('should format trans woman participant', () => {
      const profile: ProfileForGoogleContacts = {
        social_name: 'Alexia',
        full_name: 'Alexia Akira Yamamoto',
        gender: ['Mulher trans'],
        pronouns: ['ela/dela', 'ela/elu'],
      }

      const result = formatParticipantNameForGoogleContacts(profile)
      expect(result).toBe('Alexia (Alexia Akira Yamamoto) MT (ela/dela, ela/elu) Positiv')
    })

    it('should format trans man participant', () => {
      const profile: ProfileForGoogleContacts = {
        social_name: 'Pedro',
        full_name: 'Pedro Henrique Costa',
        gender: ['Homem trans'],
        pronouns: ['ele/dele'],
      }

      const result = formatParticipantNameForGoogleContacts(profile)
      expect(result).toBe('Pedro (Pedro Henrique Costa) HT (ele/dele) Positiv')
    })

    it('should format agender participant', () => {
      const profile: ProfileForGoogleContacts = {
        social_name: 'Alex',
        full_name: 'Alex Ribeiro',
        gender: ['Pessoa agênera'],
        pronouns: ['elu/delu'],
      }

      const result = formatParticipantNameForGoogleContacts(profile)
      expect(result).toBe('Alex (Alex Ribeiro) AG (elu/delu) Positiv')
    })

    it('should format non-binary participant', () => {
      const profile: ProfileForGoogleContacts = {
        social_name: 'Sam',
        full_name: 'Samuel Oliveira',
        gender: ['Pessoa não binária'],
        pronouns: ['elu/delu', 'ele/dele'],
      }

      const result = formatParticipantNameForGoogleContacts(profile)
      expect(result).toBe('Sam (Samuel Oliveira) NB (elu/delu, ele/dele) Positiv')
    })

    it('should handle participant with multiple genders', () => {
      const profile: ProfileForGoogleContacts = {
        social_name: 'Jordan',
        full_name: 'Jordan Silva',
        gender: ['Pessoa não binária', 'Pessoa agênera'],
        pronouns: ['elu/delu'],
      }

      const result = formatParticipantNameForGoogleContacts(profile)
      expect(result).toBe('Jordan (Jordan Silva) NB (elu/delu) Positiv')
    })

    it('should handle participant without pronouns', () => {
      const profile: ProfileForGoogleContacts = {
        social_name: 'Casey',
        full_name: 'Casey Lima',
        gender: ['Pessoa não binária'],
        pronouns: null,
      }

      const result = formatParticipantNameForGoogleContacts(profile)
      expect(result).toBe('Casey (Casey Lima) NB Positiv')
    })

    it('should handle participant without gender data', () => {
      const profile: ProfileForGoogleContacts = {
        social_name: 'Robin',
        full_name: 'Robin Souza',
        gender: null,
        pronouns: ['ela/dela'],
      }

      const result = formatParticipantNameForGoogleContacts(profile)
      expect(result).toBe('Robin (Robin Souza) (ela/dela) Positiv')
    })

    it('should handle empty arrays for gender and pronouns', () => {
      const profile: ProfileForGoogleContacts = {
        social_name: 'Taylor',
        full_name: 'Taylor Brown',
        gender: [],
        pronouns: [],
      }

      const result = formatParticipantNameForGoogleContacts(profile)
      expect(result).toBe('Taylor (Taylor Brown) Positiv')
    })
  })

  describe('generateGoogleContactsUrl', () => {
    it('should generate URL with email and phone', () => {
      const email = 'test@example.com'
      const phone = '11987654321'

      const result = generateGoogleContactsUrl(email, phone)
      expect(result).toBe('https://contacts.google.com/u/0/new?hl=pt-BR&email=test@example.com&phone=11987654321')
    })

    it('should generate URL with only email', () => {
      const email = 'test@example.com'

      const result = generateGoogleContactsUrl(email, null)
      expect(result).toBe('https://contacts.google.com/u/0/new?hl=pt-BR&email=test@example.com')
    })

    it('should generate URL with only phone', () => {
      const phone = '11987654321'

      const result = generateGoogleContactsUrl('', phone)
      expect(result).toBe('https://contacts.google.com/u/0/new?hl=pt-BR&phone=11987654321')
    })

    it('should handle phone as number', () => {
      const email = 'test@example.com'
      const phone = 11987654321

      const result = generateGoogleContactsUrl(email, phone)
      expect(result).toBe('https://contacts.google.com/u/0/new?hl=pt-BR&email=test@example.com&phone=11987654321')
    })

    it('should encode special characters in email', () => {
      const email = 'test+tag@example.com'
      const phone = '11987654321'

      const result = generateGoogleContactsUrl(email, phone)
      expect(result).toBe('https://contacts.google.com/u/0/new?hl=pt-BR&email=test%2Btag@example.com&phone=11987654321')
    })
  })
})