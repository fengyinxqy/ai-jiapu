import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PersonDetail } from '../components/PersonDetail'
import { renderWithApp } from '../test/utils'
import type { Person, Story } from '../types'

const mockGetStories = vi.fn()
const mockCreateStory = vi.fn()
const mockUpdateStory = vi.fn()
const mockDeleteStory = vi.fn()

vi.mock('../api', () => ({
  getStories: (...args: unknown[]) => mockGetStories(...args),
  createStory: (...args: unknown[]) => mockCreateStory(...args),
  updateStory: (...args: unknown[]) => mockUpdateStory(...args),
  deleteStory: (...args: unknown[]) => mockDeleteStory(...args),
}))

const person: Person = {
  id: 5,
  name: '张伟',
  gender: 'male',
  birth_date: '1960-05-01',
  death_date: null,
  biography: '',
  note: '',
  created_at: '',
}

const story: Story = {
  id: 1,
  person_id: 5,
  title: '年少学艺',
  content: '十六岁外出学木工。',
  created_at: '',
}

describe('PersonDetail', () => {
  beforeEach(() => {
    mockGetStories.mockReset()
    mockCreateStory.mockReset()
    mockUpdateStory.mockReset()
    mockDeleteStory.mockReset()
    mockGetStories.mockResolvedValue([])
  })

  it('编辑模式保存：提交表单并回传补丁', async () => {
    const onSave = vi.fn()
    renderWithApp(
      <PersonDetail
        person={person}
        familyId={1}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '张伟明' } })
    fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(5, {
        name: '张伟明',
        gender: 'male',
        birth_date: '1960-05-01',
        death_date: null,
        biography: '',
        note: '',
      }),
    )
  })

  it('删除成员：Popconfirm 确认后调用 onDelete', async () => {
    const onDelete = vi.fn()
    renderWithApp(
      <PersonDetail
        person={person}
        familyId={1}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={onDelete}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }))
    const confirmButtons = await screen.findAllByRole('button', { name: /删\s*除/ })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(5))
  })

  it('只读模式：无编辑/删除/添加故事控件', async () => {
    renderWithApp(
      <PersonDetail
        person={person}
        familyId={1}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        readOnly
      />,
    )

    expect(screen.getByText('你以只读身份查看成员资料。')).toBeInTheDocument()
    expect(screen.getByText('男')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^保\s*存$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /添加故事/ })).not.toBeInTheDocument()
  })

  it('加载并展示成员故事', async () => {
    mockGetStories.mockResolvedValue([story])
    renderWithApp(
      <PersonDetail
        person={person}
        familyId={1}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(await screen.findByText('年少学艺')).toBeInTheDocument()
    expect(await screen.findByText('十六岁外出学木工。')).toBeInTheDocument()
    expect(mockGetStories).toHaveBeenCalledWith(1, 5)
  })

  it('添加故事：填写表单并调用 createStory', async () => {
    mockCreateStory.mockResolvedValue(story)
    renderWithApp(
      <PersonDetail
        person={person}
        familyId={1}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /添加故事/ }))
    fireEvent.change(await screen.findByLabelText('标题'), { target: { value: '年少学艺' } })
    fireEvent.change(screen.getByLabelText('内容'), {
      target: { value: '十六岁外出学木工。' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^添\s*加$/ }))

    await waitFor(() =>
      expect(mockCreateStory).toHaveBeenCalledWith(1, 5, '年少学艺', '十六岁外出学木工。'),
    )
  })
})
