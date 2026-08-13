import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AuthError,
  changePassword,
  clearToken,
  getFamilies,
  getToken,
  login,
  me,
  setToken,
  setUnauthorizedHandler,
  updateMemberRole,
} from '../api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(status: number, data: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response
}

const headersWithoutToken = { 'Content-Type': 'application/json' }

describe('api', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    localStorage.clear()
    setUnauthorizedHandler(null)
  })

  it('token 读写与清除', () => {
    expect(getToken()).toBeNull()
    setToken('abc')
    expect(getToken()).toBe('abc')
    clearToken()
    expect(getToken()).toBeNull()
  })

  it('成功请求解析并返回 JSON', async () => {
    const user = { id: 1, username: 'alice', created_at: '' }
    mockFetch.mockResolvedValue(jsonResponse(200, user))

    await expect(me()).resolves.toEqual(user)
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', { headers: headersWithoutToken })
  })

  it('携带 token 时自动附加 Authorization 头', async () => {
    setToken('tok123')
    mockFetch.mockResolvedValue(jsonResponse(200, []))

    await getFamilies()
    expect(mockFetch).toHaveBeenCalledWith('/api/families', {
      headers: { ...headersWithoutToken, Authorization: 'Bearer tok123' },
    })
  })

  it('login 构建正确的 POST 请求与负载', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { token: 't', user: {} }))

    await login('alice', 'secret123')
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'alice', password: 'secret123' }),
      headers: headersWithoutToken,
    })
  })

  it('changePassword 构建正确的请求体', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { ok: true }))

    await changePassword('old123456', 'new123456')
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: 'old123456', new_password: 'new123456' }),
      headers: headersWithoutToken,
    })
  })

  it('updateMemberRole 构建 PATCH 请求与角色负载', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, {}))

    await updateMemberRole(3, 7, 'viewer')
    expect(mockFetch).toHaveBeenCalledWith('/api/families/3/members/7', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'viewer' }),
      headers: headersWithoutToken,
    })
  })

  it('401 时清除 token、触发未授权回调并抛 AuthError', async () => {
    setToken('tok')
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mockFetch.mockResolvedValue(jsonResponse(401, { detail: 'unauthorized' }))

    await expect(me()).rejects.toBeInstanceOf(AuthError)
    expect(getToken()).toBeNull()
    expect(handler).toHaveBeenCalled()
  })

  it('接口返回字符串 detail 时抛出对应错误', async () => {
    mockFetch.mockResolvedValue(jsonResponse(400, { detail: '用户名或密码错误' }))

    await expect(login('alice', 'wrong')).rejects.toThrow('用户名或密码错误')
  })

  it('detail 为对象时序列化为 JSON 字符串', async () => {
    mockFetch.mockResolvedValue(jsonResponse(422, { detail: [{ msg: 'field required' }] }))

    await expect(login('a', 'x')).rejects.toThrow('[{"msg":"field required"}]')
  })

  it('响应体不是 JSON 时回退到默认错误信息', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('bad json')
      },
    } as unknown as Response)

    await expect(login('a', 'x')).rejects.toThrow('请求失败（500）')
  })
})
