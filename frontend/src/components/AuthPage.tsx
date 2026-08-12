import { useState } from 'react'
import { Lock, TreePine, User } from 'lucide-react'
import { Button, Card, Form, Input } from 'antd'
import { login, register } from '../api'
import type { AuthResponse } from '../types'

interface AuthPageProps {
  onAuth: (data: AuthResponse) => void
}

interface AuthFormValues {
  username: string
  password: string
  confirm?: string
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFinish(values: AuthFormValues) {
    setError(null)
    setBusy(true)
    try {
      const result =
        mode === 'login'
          ? await login(values.username.trim(), values.password)
          : await register(values.username.trim(), values.password)
      onAuth(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-background p-6">
      <Card style={{ width: 360 }} styles={{ body: { padding: 28 } }}>
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <TreePine className="size-6" />
          </div>
          <h1 className="font-heading text-xl tracking-wide">AI 家谱</h1>
          <p className="text-sm text-muted-foreground">对话式家族谱系整理，支持多家庭协作</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <Button
            type={mode === 'login' ? 'primary' : 'text'}
            size="small"
            block
            onClick={() => {
              setMode('login')
              setError(null)
            }}
          >
            登录
          </Button>
          <Button
            type={mode === 'register' ? 'primary' : 'text'}
            size="small"
            block
            onClick={() => {
              setMode('register')
              setError(null)
            }}
          >
            注册
          </Button>
        </div>

        <Form<AuthFormValues> layout="vertical" onFinish={handleFinish} requiredMark={false}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 32, message: '用户名需 2-32 个字符' },
            ]}
          >
            <Input prefix={<User />} placeholder="2-32 个字符" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<Lock />}
              placeholder="至少 6 位"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </Form.Item>
          {mode === 'register' && (
            <Form.Item
              label="确认密码"
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  },
                }),
              ]}
            >
              <Input.Password prefix={<Lock />} placeholder="再次输入密码" autoComplete="new-password" />
            </Form.Item>
          )}
          {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
          <Button type="primary" htmlType="submit" block loading={busy}>
            {mode === 'login' ? '登录' : '注册并登录'}
          </Button>
        </Form>

        {mode === 'login' && (
          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            提示：旧版单机数据已迁移到默认账号
            <br />
            admin / admin123（登录后可在设置中修改密码）
          </p>
        )}
      </Card>
    </div>
  )
}
