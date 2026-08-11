import { useState, type FormEvent } from 'react'
import { TreePine } from 'lucide-react'
import { login, register } from '../api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { AuthResponse } from '../types'

interface AuthPageProps {
  onAuth: (data: AuthResponse) => void
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (mode === 'register' && password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setBusy(true)
    try {
      const result =
        mode === 'login'
          ? await login(username.trim(), password)
          : await register(username.trim(), password)
      onAuth(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next)
    setError(null)
    setPassword('')
    setConfirm('')
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <TreePine className="size-6" />
          </div>
          <CardTitle className="font-heading text-xl">AI 家谱</CardTitle>
          <CardDescription>对话式家族谱系整理，支持多家庭协作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                mode === 'login' ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                mode === 'register' ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground'
              }`}
            >
              注册
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="auth-username">用户名</FieldLabel>
                <Input
                  id="auth-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="2-32 个字符"
                  autoComplete="username"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="auth-password">密码</FieldLabel>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 6 位"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </Field>
              {mode === 'register' && (
                <Field>
                  <FieldLabel htmlFor="auth-confirm">确认密码</FieldLabel>
                  <Input
                    id="auth-confirm"
                    type="password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    required
                  />
                </Field>
              )}
            </FieldGroup>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? '处理中…' : mode === 'login' ? '登录' : '注册并登录'}
            </Button>
          </form>
          {mode === 'login' && (
            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              提示：旧版单机数据已迁移到默认账号
              <br />
              admin / admin123（登录后可在设置中修改密码）
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
