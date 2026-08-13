import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthPage } from '../components/AuthPage'
import type { AuthResponse } from '../types'

const mockLogin = vi.fn()
const mockRegister = vi.fn()

vi.mock('../api', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  register: (...args: unknown[]) => mockRegister(...args),
}))

const authData: AuthResponse = {
  token: 'abc',
  user: { id: 1, username: 'alice', created_at: '' },
}

describe('AuthPage', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockRegister.mockReset()
  })

  it('默认登录模式，提交调用 login 并回传结果', async () => {
    mockLogin.mockResolvedValue(authData)
    const onAuth = vi.fn()
    render(<AuthPage onAuth={onAuth} />)

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret123' } })
    fireEvent.submit(screen.getByLabelText('密码').closest('form')!)

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('alice', 'secret123'))
    await waitFor(() => expect(onAuth).toHaveBeenCalledWith(authData))
  })

  it('注册模式两次密码不一致时报错且不提交', async () => {
    render(<AuthPage onAuth={vi.fn()} />)
    fireEvent.click(screen.getByText('注册'))

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret123' } })
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'different' } })
    fireEvent.submit(screen.getByRole('button', { name: '注册并登录' }).closest('form')!)

    expect(await screen.findByText('两次输入的密码不一致')).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('注册成功调用 register 并回传结果', async () => {
    mockRegister.mockResolvedValue(authData)
    const onAuth = vi.fn()
    render(<AuthPage onAuth={onAuth} />)
    fireEvent.click(screen.getByRole('button', { name: /^注\s*册$/ }))

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: ' alice ' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret123' } })
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'secret123' } })
    fireEvent.submit(screen.getByRole('button', { name: '注册并登录' }).closest('form')!)

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith('alice', 'secret123'))
    await waitFor(() => expect(onAuth).toHaveBeenCalledWith(authData))
  })

  it('登录失败展示 API 错误信息', async () => {
    mockLogin.mockRejectedValue(new Error('用户名或密码错误'))
    render(<AuthPage onAuth={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'wrong' } })
    fireEvent.submit(screen.getByLabelText('密码').closest('form')!)

    expect(await screen.findByText('用户名或密码错误')).toBeInTheDocument()
  })

  it('请求进行中提交按钮进入 loading 状态', async () => {
    let resolveLogin!: (value: AuthResponse) => void
    mockLogin.mockImplementation(
      () => new Promise<AuthResponse>((resolve) => (resolveLogin = resolve)),
    )
    const onAuth = vi.fn()
    render(<AuthPage onAuth={onAuth} />)

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret123' } })
    fireEvent.submit(screen.getByLabelText('密码').closest('form')!)

    await waitFor(() =>
      expect(document.querySelector('button.ant-btn-loading')).not.toBeNull(),
    )

    resolveLogin(authData)
    await waitFor(() => expect(onAuth).toHaveBeenCalledWith(authData))
  })
})
