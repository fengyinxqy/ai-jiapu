import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import type { Person } from '../types'

type PersonNodeData = { person: Person }
export type PersonFlowNode = Node<PersonNodeData, 'person'>

const GENDER_LABEL: Record<Person['gender'], string> = {
  male: '男',
  female: '女',
  unknown: '未知',
}

function formatYears(person: Person): string {
  if (person.birth_year == null && person.death_year == null) {
    return GENDER_LABEL[person.gender]
  }
  return `${person.birth_year ?? '?'} — ${person.death_year ?? '至今'}`
}

function PersonNodeInner({ data, selected }: NodeProps<PersonFlowNode>) {
  const { person } = data
  const initial = person.name.trim().charAt(0) || '？'
  return (
    <div className={`person-node person-node--${person.gender}${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />
      <Handle type="target" position={Position.Left} id="left-t" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="target" position={Position.Right} id="right-t" />
      <div className="person-node__avatar">{initial}</div>
      <div className="person-node__info">
        <div className="person-node__name">{person.name}</div>
        <div className="person-node__years">{formatYears(person)}</div>
      </div>
    </div>
  )
}

export const PersonNode = memo(PersonNodeInner)
