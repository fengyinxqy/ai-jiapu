import { describe, expect, it } from 'vitest'
import { COUPLE_GAP, layoutTree, NODE_WIDTH } from '../layout'
import type { Tree } from '../types'

const sampleTree: Tree = {
  persons: [
    {
      id: 1,
      name: '张伟',
      gender: 'male',
      birth_year: 1990,
      death_year: null,
      note: '',
      created_at: '',
    },
    {
      id: 2,
      name: '张建国',
      gender: 'male',
      birth_year: 1960,
      death_year: null,
      note: '',
      created_at: '',
    },
    {
      id: 3,
      name: '李秀兰',
      gender: 'female',
      birth_year: 1962,
      death_year: null,
      note: '',
      created_at: '',
    },
  ],
  relationships: [
    { id: 1, type: 'parent_child', person_a_id: 2, person_b_id: 1 },
    { id: 2, type: 'parent_child', person_a_id: 3, person_b_id: 1 },
    { id: 3, type: 'spouse', person_a_id: 2, person_b_id: 3 },
  ],
}

describe('layoutTree', () => {
  it('生成全部节点与边', () => {
    const { nodes, edges } = layoutTree(sampleTree)
    expect(nodes).toHaveLength(3)
    expect(edges).toHaveLength(3)
  })

  it('父母在上、子女在下，夫妻同排相邻', () => {
    const { nodes } = layoutTree(sampleTree)
    const positions = Object.fromEntries(
      nodes.map((node) => [Number(node.id), node.position]),
    )
    expect(positions[1].y).toBeGreaterThan(positions[2].y)
    expect(positions[2].y).toBe(positions[3].y)
    expect(Math.abs(positions[2].x - positions[3].x)).toBeCloseTo(
      NODE_WIDTH + COUPLE_GAP,
      1,
    )
  })

  it('空家谱返回空布局', () => {
    const { nodes, edges } = layoutTree({ persons: [], relationships: [] })
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })
})
