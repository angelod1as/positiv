import { describe, expect, it } from 'vitest'
import { buildWebhookEvent } from './payment-helpers'

describe('buildWebhookEvent', () => {
  it('gives every delivery its own event id, because the inbox drops a repeated one', () => {
    const charge = { id: 'pay_1', value: 79.1, netValue: 73.4 }

    const first = buildWebhookEvent('PAYMENT_CONFIRMED', charge)
    const second = buildWebhookEvent('PAYMENT_CONFIRMED', charge)

    expect(first.id).toMatch(/^evt_/)
    expect(first.id).not.toBe(second.id)
  })

  it('carries the charge the way Asaas sends it', () => {
    const event = buildWebhookEvent('PAYMENT_CONFIRMED', {
      id: 'pay_1',
      value: 79.1,
      netValue: 73.4,
      installment: 'inst_1',
      externalReference: 'payment-uuid',
    })

    expect(event).toMatchObject({
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_1',
        value: 79.1,
        netValue: 73.4,
        installment: 'inst_1',
        externalReference: 'payment-uuid',
      },
    })
  })
})
