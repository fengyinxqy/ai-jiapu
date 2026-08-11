import type {
  AuthResponse,
  ChatHistoryItem,
  ChatResponse,
  Family,
  FamilyMember,
  FamilyRole,
  Person,
  PersonUpdate,
  Tree,
  User,
} from './types'

const TOKEN_KEY = 'ai_jiapu_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export class AuthError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`/api${path}`, { ...init, headers })
  if (response.status === 401) {
    clearToken()
    unauthorizedHandler?.()
    throw new AuthError('登录已失效，请重新登录')
  }
  if (!response.ok) {
    let detail = `请求失败（${response.status}）`
    try {
      const data = await response.json()
      if (data?.detail) {
        detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
      }
    } catch {
      // 保留默认错误信息
    }
    throw new Error(detail)
  }
  return response.json() as Promise<T>
}

// ---- 认证 ----

export function register(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function logout(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/auth/logout', { method: 'POST' })
}

export function me(): Promise<User> {
  return request<User>('/auth/me')
}

export function changePassword(
  old_password: string,
  new_password: string,
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ old_password, new_password }),
  })
}

// ---- 家谱 ----

export function getFamilies(): Promise<Family[]> {
  return request<Family[]>('/families')
}

export function createFamily(name: string): Promise<Family> {
  return request<Family>('/families', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function deleteFamily(id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/families/${id}`, { method: 'DELETE' })
}

export function joinFamily(code: string): Promise<Family> {
  return request<Family>('/families/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export function getMembers(familyId: number): Promise<FamilyMember[]> {
  return request<FamilyMember[]>(`/families/${familyId}/members`)
}

export function updateMemberRole(
  familyId: number,
  userId: number,
  role: FamilyRole,
): Promise<FamilyMember> {
  return request<FamilyMember>(`/families/${familyId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export function removeMember(familyId: number, userId: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/families/${familyId}/members/${userId}`, {
    method: 'DELETE',
  })
}

export function createInvite(familyId: number): Promise<{ code: string }> {
  return request<{ code: string }>(`/families/${familyId}/invites`, { method: 'POST' })
}

// ---- 家谱数据（树 / 对话 / 成员档案） ----

export function getTree(familyId: number): Promise<Tree> {
  return request<Tree>(`/families/${familyId}/tree`)
}

export function getHistory(familyId: number): Promise<ChatHistoryItem[]> {
  return request<ChatHistoryItem[]>(`/families/${familyId}/chat/history`)
}

export function sendChat(familyId: number, message: string): Promise<ChatResponse> {
  return request<ChatResponse>(`/families/${familyId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export function updatePerson(
  familyId: number,
  id: number,
  patch: PersonUpdate,
): Promise<Person> {
  return request<Person>(`/families/${familyId}/persons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function deletePerson(familyId: number, id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/families/${familyId}/persons/${id}`, {
    method: 'DELETE',
  })
}

export function resetTree(familyId: number): Promise<Tree> {
  return request<Tree>(`/families/${familyId}/tree/reset`, { method: 'POST' })
}
