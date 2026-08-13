import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsDialog } from '../components/SettingsDialog'
import { renderWithApp } from '../test/utils'

const mockChangePassword = vi.fn()

vi.mock('../api', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}))

describe('SettingsDialog', () => {
  beforeEach(() => {
    mockChangePassword.mockReset()
  })

  function fillForm(oldPassword: string, newPassword: string, confirm: string) {
    fireEvent.change(screen.getByLabelText('原密码'), { target: { value: oldPassword } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: newPassword } })
    fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: confirm } })
  }

  it('修改成功：调用接口、关闭弹窗并提示', async () => {
    mockChangePassword.mockResolvedValue({ ok: true })
    const onOpenChange = vi.fn()
    renderWithApp(<SettingsDialog open onOpenChange={onOpenChange} />)

    fillForm('old123456', 'new123456', 'new123456')
    fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }))

    await waitFor(() =>
      expect(mockChangePassword).toHaveBeenCalledWith('old123456', 'new123456'),
    )
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(await screen.findByText('密码已修改')).toBeInTheDocument()
  })

  it('修改失败展示 API 错误信息', async () => {
    mockChangePassword.mockRejectedValue(new Error('原密码不正确'))
    renderWithApp(<SettingsDialog open onOpenChange={vi.fn()} />)

    fillForm('wrong', 'new123456', 'new123456')
    fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }))

    expect(await screen.findByText('修改失败：原密码不正确')).toBeInTheDocument()
  })

  it('两次新密码不一致时报错且不调用接口', async () => {
    renderWithApp(<SettingsDialog open onOpenChange={vi.fn()} />)

    fillForm('old123456', 'new123456', 'different')
    fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }))

    expect(await screen.findByText('两次输入的新密码不一致')).toBeInTheDocument()
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('新密码不足 6 位时报错', async () => {
    renderWithApp(<SettingsDialog open onOpenChange={vi.fn()} />)

    fillForm('old123456', '12345', '12345')
    fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }))

    expect(await screen.findByText('新密码至少 6 位')).toBeInTheDocument()
    expect(mockChangePassword).not.toHaveBeenCalled()
  })
})
