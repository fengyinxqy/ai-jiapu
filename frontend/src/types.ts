export type Gender = 'male' | 'female' | 'unknown'
export type RelationshipType = 'spouse' | 'parent_child'

export interface Person {
  id: number
  name: string
  gender: Gender
  birth_year: number | null
  death_year: number | null
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
  Pick<Person, 'name' | 'gender' | 'birth_year' | 'death_year' | 'note'>
>
