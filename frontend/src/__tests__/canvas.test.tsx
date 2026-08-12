import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FamilyTreeCanvas } from '../components/FamilyTreeCanvas'
import type { Tree } from '../types'

const sampleTree: Tree = {
  persons: [
    {
      id: 1,
      name: '张伟',
      gender: 'male',
      birth_date: '1990-05-12',
      death_date: null,
      biography: '',
      note: '',
      created_at: '',
    },
    {
      id: 2,
      name: '张建国',
      gender: 'male',
      birth_date: '1960-03-08',
      death_date: null,
      biography: '',
      note: '',
      created_at: '',
    },
  ],
  relationships: [
    { id: 1, type: 'parent_child', person_a_id: 2, person_b_id: 1 },
  ],
}

describe('FamilyTreeCanvas', () => {
  it('渲染树快照中的成员', () => {
    render(<FamilyTreeCanvas tree={sampleTree} onSelect={vi.fn()} />)
    expect(screen.getByText('张伟')).toBeInTheDocument()
    expect(screen.getByText('张建国')).toBeInTheDocument()
  })

  it('空树显示引导提示', () => {
    render(<FamilyTreeCanvas tree={{ persons: [], relationships: [] }} onSelect={vi.fn()} />)
    expect(screen.getByText('家谱还是空的')).toBeInTheDocument()
  })
})
