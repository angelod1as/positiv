import { describe, expect, it } from 'vitest'
import { buildRestoreStatement, staleBackupTables } from './integration-global-setup'

const PROFILE_COLUMNS = ['id', 'user_id', 'email']
const PROFILE_FOREIGN_KEYS = [{ column: 'user_id', refTable: 'auth.users', refColumn: 'id' }]

describe('buildRestoreStatement', () => {
  it('restores every row when the table references nothing', () => {
    const statement = buildRestoreStatement('events', ['id', 'title'], '_backup_1_events', [])

    expect(statement).toBe('INSERT INTO events ("id", "title") SELECT "id", "title" FROM _backup_1_events b')
  })

  it('skips a row whose referenced row is gone', () => {
    const statement = buildRestoreStatement('profiles', PROFILE_COLUMNS, '_backup_1_profiles', PROFILE_FOREIGN_KEYS)

    expect(statement).toContain(
      'WHERE (b."user_id" IS NULL OR EXISTS (SELECT 1 FROM auth.users ref WHERE ref."id" = b."user_id"))'
    )
  })

  it('requires every reference of a row to still resolve', () => {
    const statement = buildRestoreStatement(
      'event_participants',
      ['id', 'event_id', 'profile_id'],
      '_backup_1_event_participants',
      [
        { column: 'event_id', refTable: 'events', refColumn: 'id' },
        { column: 'profile_id', refTable: 'profiles', refColumn: 'id' },
      ]
    )

    expect(statement).toContain('b."event_id"')
    expect(statement).toContain('b."profile_id"')
    expect(statement).toContain(') AND (')
  })
})

describe('staleBackupTables', () => {
  const alive = (pid: number) => pid === 10

  it('keeps the backups of a run that is still going', () => {
    expect(staleBackupTables(['_backup_10_profiles'], alive)).toEqual([])
  })

  it('collects the backups a dead run left behind', () => {
    expect(staleBackupTables(['_backup_20_profiles', '_backup_20_events'], alive)).toEqual([
      '_backup_20_profiles',
      '_backup_20_events',
    ])
  })

  it('leaves anything that is not a backup table alone', () => {
    expect(staleBackupTables(['profiles', 'events', '_backup_nonsense'], alive)).toEqual([])
  })
})
