import { MarkerType, type Edge, type Node } from '@xyflow/react'
import dagre from 'dagre'
import type { Tree } from './types'

export const NODE_WIDTH = 180
export const NODE_HEIGHT = 66
export const COUPLE_GAP = 28

const GENDER_ORDER = { male: 0, female: 1, unknown: 2 } as const

export interface LayoutResult {
  nodes: Node[]
  edges: Edge[]
}

/**
 * 基于 dagre 的家谱自动布局：
 * 夫妻先合并为同一“单元”同排展示，单元之间用亲子关系自上而下排列。
 */
export function layoutTree(tree: Tree): LayoutResult {
  const { persons, relationships } = tree
  if (persons.length === 0) return { nodes: [], edges: [] }

  const byId = new Map(persons.map((p) => [p.id, p]))
  const parentRels = relationships.filter((r) => r.type === 'parent_child')
  const spouseRels = relationships.filter((r) => r.type === 'spouse')

  // 并查集：把配偶合并为单元
  const unionRoot = new Map<number, number>()
  const find = (x: number): number => {
    let root = unionRoot.get(x) ?? x
    while (unionRoot.has(root)) {
      root = unionRoot.get(root)!
    }
    return root
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) unionRoot.set(rb, ra)
  }
  for (const rel of spouseRels) union(rel.person_a_id, rel.person_b_id)

  const units = new Map<number, number[]>()
  for (const person of persons) {
    const root = find(person.id)
    const list = units.get(root) ?? []
    list.push(person.id)
    units.set(root, list)
  }
  for (const list of units.values()) {
    list.sort((a, b) => GENDER_ORDER[byId.get(a)!.gender] - GENDER_ORDER[byId.get(b)!.gender])
  }

  const unitWidth = (ids: number[]) =>
    ids.length * NODE_WIDTH + (ids.length - 1) * COUPLE_GAP

  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 100,
    marginx: 24,
    marginy: 24,
  })
  for (const [unitId, ids] of units) {
    graph.setNode(String(unitId), { width: unitWidth(ids), height: NODE_HEIGHT })
  }
  const layoutEdgeKeys = new Set<string>()
  for (const rel of parentRels) {
    const unitA = find(rel.person_a_id)
    const unitB = find(rel.person_b_id)
    if (unitA !== unitB) layoutEdgeKeys.add(`${unitA}-${unitB}`)
  }
  for (const key of layoutEdgeKeys) {
    const [a, b] = key.split('-')
    graph.setEdge(a, b)
  }
  dagre.layout(graph)

  const nodes: Node[] = []
  const nodeByPersonId = new Map<number, Node>()
  for (const [unitId, ids] of units) {
    const center = graph.node(String(unitId))
    const total = unitWidth(ids)
    ids.forEach((personId, index) => {
      const person = byId.get(personId)!
      const slotCenter = -total / 2 + index * (NODE_WIDTH + COUPLE_GAP) + NODE_WIDTH / 2
      const node: Node = {
        id: String(personId),
        type: 'person',
        position: {
          x: center.x + slotCenter - NODE_WIDTH / 2,
          y: center.y - NODE_HEIGHT / 2,
        },
        data: { person },
      }
      nodes.push(node)
      nodeByPersonId.set(personId, node)
    })
  }

  const edges: Edge[] = parentRels.map((rel) => ({
    id: `parent-${rel.id}`,
    source: String(rel.person_a_id),
    target: String(rel.person_b_id),
    sourceHandle: 'bottom',
    targetHandle: 'top',
    className: 'edge-parent',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#7a4a2b' },
  }))

  for (const rel of spouseRels) {
    const a = nodeByPersonId.get(rel.person_a_id)
    const b = nodeByPersonId.get(rel.person_b_id)
    if (!a || !b) continue
    const aIsLeft = a.position.x < b.position.x
    edges.push({
      id: `spouse-${rel.id}`,
      source: String(rel.person_a_id),
      target: String(rel.person_b_id),
      sourceHandle: aIsLeft ? 'right' : 'left',
      targetHandle: aIsLeft ? 'left-t' : 'right-t',
      type: 'straight',
      className: 'edge-spouse',
    })
  }

  return { nodes, edges }
}
