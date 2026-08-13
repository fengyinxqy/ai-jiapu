import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateFamilyDialog, JoinFamilyDialog } from '../components/FamilyDialogs'
import { renderWithApp } from '../test/utils'
import type { Family } from '../types'

const mockCreateFamily = vi.fn()
const mockJoinFamily = vi.fn()

vi.mock('../api', () => ({
  createFamily: (...args: unknown[]) => mockCreateFamily(...args),
  joinFamily: (...args: unknown[]) => mockJoinFamily(...args),
}))

const family: Family = { id: 1, name: '张家家谱', owner_id: 1, role: 'owner', created_at: '' }

describe('CreateFamilyDialog', () => {
  beforeEach(() => {
    mockCreateFamily.mockReset()
    mockJoinFamily.mockReset()
  })

  it('创建成功：名称去空格、关闭弹窗并回传结果', async () => {
    mockCreateFamily.mockResolvedValue(family)
    const onOpenChange = vi.fn()
    const onCreated = vi.fn()
    renderWithApp(
      <CreateFamilyDialog open onOpenChange={onOpenChange} onCreated={onCreated} />,
    )

    fireEvent.change(screen.getByLabelText('家谱名称'), { target: { value: '  张家家谱  ' } })
    fireEvent.click(screen.getByRole('button', { name: /^创\s*建$/ }))

    await waitFor(() => expect(mockCreateFamily).toHaveBeenCalledWith('张家家谱'))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(family))
  })

  it('创建失败展示 API 错误信息', async () => {
    mockCreateFamily.mockRejectedValue(new Error('已存在同名家谱'))
    renderWithApp(
      <CreateFamilyDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />,
    )

    fireEvent.change(screen.getByLabelText('家谱名称'), { target: { value: '张家家谱' } })
    fireEvent.click(screen.getByRole('button', { name: /^创\s*建$/ }))

    expect(await screen.findByText('创建失败：已存在同名家谱')).toBeInTheDocument()
  })

  it('名称为空时校验拦截，不调用接口', async () => {
    renderWithApp(
      <CreateFamilyDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^创\s*建$/ }))

    expect(await screen.findByText('请输入家谱名称')).toBeInTheDocument()
    expect(mockCreateFamily).not.toHaveBeenCalled()
  })
})

describe('JoinFamilyDialog', () => {
  beforeEach(() => {
    mockCreateFamily.mockReset()
    mockJoinFamily.mockReset()
  })

  it('加入成功：邀请码去空格转大写、关闭弹窗并回传结果', async () => {
    mockJoinFamily.mockResolvedValue(family)
    const onOpenChange = vi.fn()
    const onJoined = vi.fn()
    renderWithApp(<JoinFamilyDialog open onOpenChange={onOpenChange} onJoined={onJoined} />)

    fireEvent.change(screen.getByLabelText('邀请码'), { target: { value: ' a1b2c3 ' } })
    fireEvent.click(screen.getByRole('button', { name: /^加\s*入$/ }))

    await waitFor(() => expect(mockJoinFamily).toHaveBeenCalledWith('A1B2C3'))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(family))
  })

  it('加入失败展示 API 错误信息', async () => {
    mockJoinFamily.mockRejectedValue(new Error('邀请码无效'))
    renderWithApp(<JoinFamilyDialog open onOpenChange={vi.fn()} onJoined={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('邀请码'), { target: { value: 'xxxxxx' } })
    fireEvent.click(screen.getByRole('button', { name: /^加\s*入$/ }))

    expect(await screen.findByText('加入失败：邀请码无效')).toBeInTheDocument()
  })
})
