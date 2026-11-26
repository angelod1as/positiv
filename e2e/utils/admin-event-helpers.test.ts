import { describe, expect, it } from 'vitest'
import { adminContextSchema } from '../../app/business/auth/auth-schemas'
import { eventFormSchema } from '../../app/business/event/event-schemas'
import { adminContext, adminEventFormValues } from './admin-event-helpers'

describe('adminEventFormValues', () => {
  it('builds what the admin event form accepts', () => {
    const values = adminEventFormValues('[E2E:abc] Event', new Date('2026-12-20T20:00:00Z'))

    expect(eventFormSchema.safeParse(values).success).toBe(true)
  })

  it('fills the dates the way the calculate button does, from the start', () => {
    const start = new Date('2026-12-20T20:00:00Z')

    const values = adminEventFormValues('[E2E:abc] Event', start)

    expect(new Date(values.time_event_start).getTime()).toBe(start.getTime())
    expect(new Date(values.time_application_start).getTime()).toBeLessThan(start.getTime())
    expect(new Date(values.time_group_end).getTime()).toBeGreaterThan(start.getTime())
  })
})

describe('adminContext', () => {
  it('is a context the admin event functions accept', () => {
    expect(adminContextSchema.safeParse(adminContext('event-id')).error).toBeUndefined()
  })
})
