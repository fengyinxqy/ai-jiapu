import { useState, type FormEvent } from 'react'
import { createFamily, joinFamily } from '../api'
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
import type { Family } from '../types'

interface CreateFamilyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (family: Family) => void
}

export function CreateFamilyDialog({ open, onOpenChange, onCreated }: CreateFamilyDialogProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      const family = await createFamily(trimmed)
      setName('')
      onOpenChange(false)
      onCreated(family)
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
          <DialogTitle>创建家谱</DialogTitle>
          <DialogDescription>给自己新建一个家谱，稍后可以邀请家人一起编辑。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="family-name">家谱名称</FieldLabel>
              <Input
                id="family-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：张家家谱"
                maxLength={100}
                required
              />
            </Field>
          </FieldGroup>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={busy || !name.trim()}>
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface JoinFamilyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJoined: (family: Family) => void
}

export function JoinFamilyDialog({ open, onOpenChange, onJoined }: JoinFamilyDialogProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    setError(null)
    try {
      const family = await joinFamily(code.trim().toUpperCase())
      setCode('')
      onOpenChange(false)
      onJoined(family)
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
          <DialogTitle>加入家谱</DialogTitle>
          <DialogDescription>输入家人分享给你的 6 位邀请码，即可成为该家谱的编辑成员。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="invite-code">邀请码</FieldLabel>
              <Input
                id="invite-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="例如：A1B2C3"
                maxLength={16}
                required
              />
            </Field>
          </FieldGroup>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={busy || !code.trim()}>
              加入
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
