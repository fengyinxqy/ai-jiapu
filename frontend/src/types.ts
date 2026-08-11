export type Gender = 'male' | 'female' | 'unknown'
export type RelationshipType = 'spouse' | 'parent_child'

export interface Person {
  id: number
  name: string
  gender: Gender
  birth_date: string | null
  death_date: string | null
  note: string
  created_at: string
}

export interface Relationship {
  id: number
  type: RelationshipType
  person_a_id: number
  person_b_id: number
}

export interface Tree {
  persons: Person[]
  relationships: Relationship[]
}

export interface ChatResponse {
  reply: string
  tree: Tree
}

export interface ChatHistoryItem {
  id: number
  role: 'user' | 'assistant'
  content: string
}

export type UiMessage = ChatHistoryItem

export type PersonUpdate = Partial<
  Pick<Person, 'name' | 'gender' | 'birth_date' | 'death_date' | 'note'>
>

export type FamilyRole = 'owner' | 'editor' | 'viewer'

export interface User {
  id: number
  username: string
  created_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Family {
  id: number
  name: string
  owner_id: number
  role: FamilyRole
  created_at: string
}

export interface FamilyMember {
  user_id: number
  username: string
  role: FamilyRole
  created_at: string
}
