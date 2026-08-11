import { useCallback, useEffect, useState } from 'react'
import { Copy, RefreshCw, Trash2, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createInvite,
  deleteFamily,
  getMembers,
  removeMember,
  updateMemberRole,
} from '../api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { Family, FamilyMember, FamilyRole } from '../types'

const ROLE_OPTIONS: { value: FamilyRole; label: string }[] = [
  { value: 'editor', label: '编辑' },
  { value: 'viewer', label: '只读' },
]

const ROLE_LABEL: Record<FamilyRole, string> = {
  owner: '创建者',
  editor: '编辑',
  viewer: '只读',
}

interface MembersDialogProps {
  family: Family
  open: boolean
  onOpenChange: (open: boolean) => void
  onFamilyDeleted: () => void
}

export function MembersDialog({
  family,
  open,
  onOpenChange,
  onFamilyDeleted,
}: MembersDialogProps) {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<FamilyMember | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const list = await getMembers(family.id)
    setMembers(list)
  }, [family.id])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  async function handleInvite() {
    setBusy(true)
    try {
      const result = await createInvite(family.id)
      setInviteCode(result.code)
      toast.success('邀请码已生成', { description: '分享给家人即可加入。' })
    } catch (error) {
      toast.error('生成失败', { description: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      toast.success('邀请码已复制')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  async function handleRoleChange(userId: number, role: FamilyRole) {
    try {
      await updateMemberRole(family.id, userId, role)
      await load()
      toast.success('角色已更新')
    } catch (error) {
      toast.error('更新失败', { description: (error as Error).message })
    }
  }

  async function confirmRemove() {
    if (!pendingRemove) return
    try {
      await removeMember(family.id, pendingRemove.user_id)
      toast.success('已移除', { description: `${pendingRemove.username} 已移出家谱。` })
      setPendingRemove(null)
      await load()
    } catch (error) {
      toast.error('移除失败', { description: (error as Error).message })
    }
  }

  async function confirmDeleteFamily() {
    try {
      await deleteFamily(family.id)
      toast.success('家谱已删除')
      onFamilyDeleted()
    } catch (error) {
      toast.error('删除失败', { description: (error as Error).message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>成员管理 · {family.name}</DialogTitle>
          <DialogDescription>管理家庭成员的角色，或分享邀请码让家人加入。</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-dashed p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">邀请码</span>
              {!inviteCode && (
                <Button type="button" size="sm" onClick={() => void handleInvite()} disabled={busy}>
                  <RefreshCw data-icon="inline-start" />
                  生成邀请码
                </Button>
              )}
            </div>
            {inviteCode ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-center font-mono text-lg tracking-[0.3em]">
                  {inviteCode}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
                  <Copy data-icon="inline-start" />
                  复制
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleInvite()}
                  disabled={busy}
                  aria-label="重新生成邀请码"
                >
                  <RefreshCw />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                生成后分享给家人，凭码加入即为编辑成员。
              </p>
            )}
          </div>

          <Separator />

          <ul className="flex flex-col gap-2">
            {members.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm">{member.username}</span>
                  {member.role === 'owner' && <Badge>创建者</Badge>}
                </div>
                {member.role === 'owner' ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        void handleRoleChange(member.user_id, value as FamilyRole)
                      }
                    >
                      <SelectTrigger className="h-7 w-24" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setPendingRemove(member)}
                      aria-label={`移除 ${member.username}`}
                    >
                      <UserMinus />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="mt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                <Trash2 data-icon="inline-start" />
                删除家谱
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>删除「{family.name}」？</AlertDialogTitle>
                <AlertDialogDescription>
                  家谱、成员档案、聊天记录将被全部删除，所有成员都会失去访问权限，此操作不可恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => void confirmDeleteFamily()}>
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>

        <AlertDialog
          open={pendingRemove !== null}
          onOpenChange={(open) => !open && setPendingRemove(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                移除 {pendingRemove ? ROLE_LABEL[pendingRemove.role] : ''}成员
                {pendingRemove?.username}？
              </AlertDialogTitle>
              <AlertDialogDescription>
                被移除的成员将无法再查看或编辑这个家谱。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => void confirmRemove()}>移除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
