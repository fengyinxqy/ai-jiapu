import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MembersDialog } from '../components/MembersDialog'
import { renderWithApp } from '../test/utils'
import type { Family, FamilyMember } from '../types'

const mockGetMembers = vi.fn()
const mockCreateInvite = vi.fn()
const mockUpdateMemberRole = vi.fn()
const mockRemoveMember = vi.fn()
const mockDeleteFamily = vi.fn()

vi.mock('../api', () => ({
  getMembers: (...args: unknown[]) => mockGetMembers(...args),
  createInvite: (...args: unknown[]) => mockCreateInvite(...args),
  updateMemberRole: (...args: unknown[]) => mockUpdateMemberRole(...args),
  removeMember: (...args: unknown[]) => mockRemoveMember(...args),
  deleteFamily: (...args: unknown[]) => mockDeleteFamily(...args),
}))

const family: Family = { id: 1, name: '张家家谱', owner_id: 1, role: 'owner', created_at: '' }

const members: FamilyMember[] = [
  { user_id: 1, username: 'alice', role: 'owner', created_at: '' },
  { user_id: 2, username: 'bob', role: 'editor', created_at: '' },
]

function renderDialog(onFamilyDeleted = vi.fn()) {
  return renderWithApp(
    <MembersDialog
      family={family}
      open
      onOpenChange={vi.fn()}
      onFamilyDeleted={onFamilyDeleted}
    />,
  )
}

describe('MembersDialog', () => {
  beforeEach(() => {
    mockGetMembers.mockReset()
    mockCreateInvite.mockReset()
    mockUpdateMemberRole.mockReset()
    mockRemoveMember.mockReset()
    mockDeleteFamily.mockReset()
    mockGetMembers.mockResolvedValue(members)
  })

  it('打开后加载成员列表，创建者展示标签', async () => {
    renderDialog()

    expect(await screen.findByText('alice')).toBeInTheDocument()
    expect(await screen.findByText('bob')).toBeInTheDocument()
    expect(screen.getByText('创建者')).toBeInTheDocument()
    expect(mockGetMembers).toHaveBeenCalledWith(1)
  })

  it('生成邀请码后展示，可重新生成', async () => {
    mockCreateInvite.mockResolvedValue({ code: 'A1B2C3' })
    renderDialog()

    fireEvent.click(await screen.findByRole('button', { name: /生成邀请码/ }))

    expect(await screen.findByText('A1B2C3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重新生成邀请码' })).toBeInTheDocument()
    expect(mockCreateInvite).toHaveBeenCalledWith(1)
  })

  it('切换成员角色后刷新列表', async () => {
    mockUpdateMemberRole.mockResolvedValue({})
    renderDialog()

    fireEvent.mouseDown(await screen.findByRole('combobox'))
    fireEvent.click(await screen.findByText('只读'))

    await waitFor(() => expect(mockUpdateMemberRole).toHaveBeenCalledWith(1, 2, 'viewer'))
    await waitFor(() => expect(mockGetMembers.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('移除成员：Popconfirm 确认后调用接口并刷新', async () => {
    mockRemoveMember.mockResolvedValue({ ok: true })
    renderDialog()

    fireEvent.click(await screen.findByRole('button', { name: '移除 bob' }))
    const confirmButtons = await screen.findAllByRole('button', { name: /移\s*除/ })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => expect(mockRemoveMember).toHaveBeenCalledWith(1, 2))
    await waitFor(() => expect(mockGetMembers.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('删除家谱：Popconfirm 确认后调用接口并通知父组件', async () => {
    mockDeleteFamily.mockResolvedValue({ ok: true })
    const onFamilyDeleted = vi.fn()
    renderDialog(onFamilyDeleted)

    fireEvent.click(await screen.findByRole('button', { name: /删除家谱/ }))
    const confirmButtons = await screen.findAllByRole('button', { name: /删\s*除/ })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => expect(mockDeleteFamily).toHaveBeenCalledWith(1))
    await waitFor(() => expect(onFamilyDeleted).toHaveBeenCalled())
  })
})
