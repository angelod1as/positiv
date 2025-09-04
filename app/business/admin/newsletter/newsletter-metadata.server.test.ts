import { describe, it, expect } from 'vitest'
import { formatSegmentDescription, formatSenderName } from './newsletter-metadata.server'

describe('Newsletter Metadata Functions', () => {
  describe('formatSegmentDescription', () => {
    it('should return default message for no filter', () => {
      expect(formatSegmentDescription(null, true)).toBe("Todos os inscritos (excluindo rejeitados)")
      expect(formatSegmentDescription(undefined, true)).toBe("Todos os inscritos (excluindo rejeitados)")
      expect(formatSegmentDescription(null, false)).toBe("Todos os inscritos")
    })

    it('should format veterans filter correctly', () => {
      const filter = JSON.stringify({ veteransOnly: true, excludeRejected: true })
      expect(formatSegmentDescription(filter)).toBe("Veteranos (excluindo rejeitados)")
    })

    it('should format newbies filter correctly', () => {
      const filter = JSON.stringify({ newbiesOnly: true, excludeRejected: true })
      expect(formatSegmentDescription(filter)).toBe("Novatos (excluindo rejeitados)")
    })

    it('should format activity type filters correctly', () => {
      const neverAttended = JSON.stringify({ activityType: 'never_attended', excludeRejected: true })
      expect(formatSegmentDescription(neverAttended)).toBe("Nunca participou (excluindo rejeitados)")

      const hasAttended = JSON.stringify({ activityType: 'has_attended', excludeRejected: true })
      expect(formatSegmentDescription(hasAttended)).toBe("Já participou (excluindo rejeitados)")

      const neverApplied = JSON.stringify({ activityType: 'never_applied', excludeRejected: true })
      expect(formatSegmentDescription(neverApplied)).toBe("Nunca se inscreveu (excluindo rejeitados)")

      const appliedNeverAttended = JSON.stringify({ activityType: 'applied_never_attended', excludeRejected: true })
      expect(formatSegmentDescription(appliedNeverAttended)).toBe("Se inscreveu mas nunca participou (excluindo rejeitados)")
    })

    it('should format multiple filters correctly', () => {
      const filter = JSON.stringify({ 
        veteransOnly: true, 
        activityStatus: 'recent',
        excludeRejected: false 
      })
      expect(formatSegmentDescription(filter)).toBe("Veteranos, Atividade recente")
    })

    it('should format registered within days filter correctly', () => {
      const filter = JSON.stringify({ 
        registeredWithinDays: 30,
        excludeRejected: true 
      })
      expect(formatSegmentDescription(filter)).toBe("Cadastrados nos últimos 30 dias (excluindo rejeitados)")
    })

    it('should format event attendance count filters correctly', () => {
      const minFilter = JSON.stringify({ eventAttendanceCount: { min: 5 }, excludeRejected: true })
      expect(formatSegmentDescription(minFilter)).toBe("Participou de pelo menos 5 eventos (excluindo rejeitados)")

      const maxFilter = JSON.stringify({ eventAttendanceCount: { max: 3 }, excludeRejected: true })
      expect(formatSegmentDescription(maxFilter)).toBe("Participou de no máximo 3 eventos (excluindo rejeitados)")

      const rangeFilter = JSON.stringify({ eventAttendanceCount: { min: 2, max: 5 }, excludeRejected: true })
      expect(formatSegmentDescription(rangeFilter)).toBe("Participou de 2 a 5 eventos (excluindo rejeitados)")

      const exactFilter = JSON.stringify({ eventAttendanceCount: { exact: 1 }, excludeRejected: true })
      expect(formatSegmentDescription(exactFilter)).toBe("Participou de exatamente 1 evento (excluindo rejeitados)")
    })

    it('should handle invalid JSON gracefully', () => {
      expect(formatSegmentDescription("invalid json")).toBe("Configuração inválida")
    })

    it('should handle object input as well as string', () => {
      const filter = { veteransOnly: true, excludeRejected: true }
      expect(formatSegmentDescription(filter as unknown as string)).toBe("Veteranos (excluindo rejeitados)")
    })
  })

  describe('formatSenderName', () => {
    it('should return creator name when available', () => {
      expect(formatSenderName('John Doe', 'john@example.com')).toBe('John Doe')
    })

    it('should return email prefix when name is not available', () => {
      expect(formatSenderName(null, 'john@example.com')).toBe('john')
      expect(formatSenderName(undefined, 'admin@example.com')).toBe('admin')
    })

    it('should return Sistema when neither name nor email is available', () => {
      expect(formatSenderName(null, null)).toBe('Sistema')
      expect(formatSenderName(undefined, undefined)).toBe('Sistema')
    })
  })
})