import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Trash2, UserMinus } from 'lucide-react'
import {
  App as AntdApp,
  Button,
  Divider,
  Modal,
  Popconfirm,
  Select,
  Tag,
  Typography,
} from 'antd'
import {
  createInvite,
  deleteFamily,
  getMembers,
  removeMember,
  updateMemberRole,
} from '../api'
import type { Family, FamilyMember, FamilyRole } from '../types'

const ROLE_OPTIONS: { label: string; value: FamilyRole }[] = [
  { value: 'editor', label: '编辑' },
  { value: 'viewer', label: '只读' },
]

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
  const { message } = AntdApp.useApp()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [inviteCode, setInviteCode] = useState<string | null>(null)
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
      message.success('邀请码已生成，分享给家人即可加入')
    } catch (error) {
      message.error(`生成失败：${(error as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleRoleChange(userId: number, role: FamilyRole) {
    try {
      await updateMemberRole(family.id, userId, role)
      await load()
      message.success('角色已更新')
    } catch (error) {
      message.error(`更新失败：${(error as Error).message}`)
    }
  }

  async function confirmRemove(member: FamilyMember) {
    try {
      await removeMember(family.id, member.user_id)
      message.success(`${member.username} 已移出家谱`)
      await load()
    } catch (error) {
      message.error(`移除失败：${(error as Error).message}`)
    }
  }

  async function confirmDeleteFamily() {
    try {
      await deleteFamily(family.id)
      message.success('家谱已删除')
      onFamilyDeleted()
    } catch (error) {
      message.error(`删除失败：${(error as Error).message}`)
    }
  }

  return (
    <Modal
      open={open}
      title={`成员管理 · ${family.name}`}
      footer={null}
      onCancel={() => onOpenChange(false)}
      width={520}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-dashed border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">邀请码</span>
            {!inviteCode && (
              <Button size="small" icon={<RefreshCw />} onClick={() => void handleInvite()} loading={busy}>
                生成邀请码
              </Button>
            )}
          </div>
          {inviteCode ? (
            <div className="flex items-center gap-2">
              <Typography.Text
                code
                copyable
                strong
                style={{ fontSize: 18, letterSpacing: 6 }}
              >
                {inviteCode}
              </Typography.Text>
              <Button
                size="small"
                type="text"
                icon={<RefreshCw />}
                onClick={() => void handleInvite()}
                loading={busy}
                aria-label="重新生成邀请码"
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">生成后分享给家人，凭码加入即为编辑成员。</p>
          )}
        </div>

        <Divider className="my-0" />

        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li key={member.user_id} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm">{member.username}</span>
                {member.role === 'owner' && <Tag color="#a94438" className="m-0">创建者</Tag>}
              </div>
              {member.role === 'owner' ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Select
                    size="small"
                    value={member.role}
                    onChange={(role) => void handleRoleChange(member.user_id, role)}
                    options={ROLE_OPTIONS}
                    style={{ width: 96 }}
                  />
                  <Popconfirm
                    title={`移除 ${member.username}？`}
                    description="被移除的成员将无法再查看或编辑这个家谱。"
                    okText="移除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => void confirmRemove(member)}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<UserMinus />}
                      aria-label={`移除 ${member.username}`}
                    />
                  </Popconfirm>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Popconfirm
            title={`删除「${family.name}」？`}
            description="家谱、成员档案、聊天记录将被全部删除，此操作不可恢复。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void confirmDeleteFamily()}
          >
            <Button danger icon={<Trash2 />}>
              删除家谱
            </Button>
          </Popconfirm>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </div>
      </div>
    </Modal>
  )
}
