import { describe, it, expect } from 'vitest'
import { registerUser, loginUser, updateProfile } from '@/lib/services/users'

describe('user service', () => {
  it('registers a new user and returns claims', async () => {
    const { user, claims } = await registerUser({ name: 'Ann', email: 'ANN@x.com', password: 'password1' })
    expect(user.email).toBe('ann@x.com')
    expect(user.role).toBe('user')
    expect(claims.sub).toBe(String(user._id))
  })
  it('rejects duplicate email', async () => {
    await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    await expect(registerUser({ name: 'B', email: 'a@x.com', password: 'password1' }))
      .rejects.toMatchObject({ status: 409 })
  })
  it('auto-promotes ADMIN_EMAIL to admin', async () => {
    process.env.ADMIN_EMAIL = 'boss@x.com'
    const { user } = await registerUser({ name: 'Boss', email: 'boss@x.com', password: 'password1' })
    expect(user.role).toBe('admin')
    delete process.env.ADMIN_EMAIL
  })
  it('logs in with correct password, rejects wrong', async () => {
    await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    const ok = await loginUser({ email: 'a@x.com', password: 'password1' })
    expect(ok.claims.sub).toBeDefined()
    await expect(loginUser({ email: 'a@x.com', password: 'nope' }))
      .rejects.toMatchObject({ status: 401 })
  })
  it('updates profile name and password', async () => {
    const { user } = await registerUser({ name: 'A', email: 'a@x.com', password: 'password1' })
    const updated = await updateProfile(String(user._id), { name: 'A2' })
    expect(updated.name).toBe('A2')
    await updateProfile(String(user._id), { password: 'newpass12' })
    const ok = await loginUser({ email: 'a@x.com', password: 'newpass12' })
    expect(ok.claims.sub).toBe(String(user._id))
  })
})
