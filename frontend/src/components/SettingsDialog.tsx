import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { changePassword } from '../api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (newPassword.length < 6) {
      setError('新密码至少 6 位')
      return
    }
    if (newPassword !== confirm) {
      setError('两次输入的新密码不一致')
      return
    }
    setBusy(true)
    try {
      await changePassword(oldPassword, newPassword)
      setOldPassword('')
      setNewPassword('')
      setConfirm('')
      onOpenChange(false)
      toast.success('密码已修改')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>修改你的登录密码。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="old-password">原密码</FieldLabel>
              <Input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">新密码</FieldLabel>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="至少 6 位"
                autoComplete="new-password"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">确认新密码</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                required
              />
            </Field>
          </FieldGroup>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={busy}>
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
