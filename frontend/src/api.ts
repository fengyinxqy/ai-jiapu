import type { ChatHistoryItem, ChatResponse, Person, PersonUpdate, Tree } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
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

export function getTree(): Promise<Tree> {
  return request<Tree>('/tree')
}

export function getHistory(): Promise<ChatHistoryItem[]> {
  return request<ChatHistoryItem[]>('/chat/history')
}

export function sendChat(message: string): Promise<ChatResponse> {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export function updatePerson(id: number, patch: PersonUpdate): Promise<Person> {
  return request<Person>(`/persons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function deletePerson(id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/persons/${id}`, {
    method: 'DELETE',
  })
}

export function resetTree(): Promise<Tree> {
  return request<Tree>('/tree/reset', {
    method: 'POST',
  })
}
