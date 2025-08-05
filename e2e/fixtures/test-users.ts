export const TEST_USERS = {
  admin: {
    email: 'admin@example.com',
    password: 'test1234',
    role: 'admin'
  },
  user1: {
    email: 'user1@example.com',
    password: 'test1234',
    role: 'user'
  },
  user2: {
    email: 'user2@example.com',
    password: 'test1234',
    role: 'user'
  },
  user3: {
    email: 'user3@example.com',
    password: 'test1234',
    role: 'user'
  },
  user4: {
    email: 'user4@example.com',
    password: 'test1234',
    role: 'user'
  },
  user5: {
    email: 'user5@example.com',
    password: 'test1234',
    role: 'user'
  },
  user6: {
    email: 'user6@example.com',
    password: 'test1234',
    role: 'user'
  },
  user7: {
    email: 'user7@example.com',
    password: 'test1234',
    role: 'user'
  },
  user8: {
    email: 'user8@example.com',
    password: 'test1234',
    role: 'user'
  },
  user9: {
    email: 'user9@example.com',
    password: 'test1234',
    role: 'user'
  }
} as const

export type TestUserRole = 'admin' | 'user'
export type TestUserKey = keyof typeof TEST_USERS
export type TestUser = typeof TEST_USERS[TestUserKey]

export function getTestUserByRole(role: TestUserRole): TestUser[] {
  return Object.values(TEST_USERS).filter(user => user.role === role)
}

export function getRandomUser(excludeEmails?: string[]): TestUser {
  const users = getTestUserByRole('user').filter(
    user => !excludeEmails?.includes(user.email)
  )
  return users[Math.floor(Math.random() * users.length)]
}