import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LogOut,
  MessageSquareText,
  Plus,
  RotateCcw,
  Settings,
  TreePine,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  Alert,
  App as AntdApp,
  Avatar,
  Button,
  Dropdown,
  FloatButton,
  Popconfirm,
  Select,
  Tag,
} from 'antd'
import {
  clearToken,
  deletePerson,
  getFamilies,
  getHistory,
  getToken,
  getTree,
  logout as apiLogout,
  me,
  resetTree,
  sendChat,
  setToken,
  setUnauthorizedHandler,
  updatePerson,
} from './api'
import { AuthPage } from './components/AuthPage'
import { ChatPanel } from './components/ChatPanel'
import { CreateFamilyDialog, JoinFamilyDialog } from './components/FamilyDialogs'
import { FamilyTreeCanvas } from './components/FamilyTreeCanvas'
import { MembersDialog } from './components/MembersDialog'
import { PersonDetail } from './components/PersonDetail'
import { SettingsDialog } from './components/SettingsDialog'
import type {
  AuthResponse,
  Family,
  FamilyRole,
  Person,
  PersonUpdate,
  Tree,
  UiMessage,
  User,
} from './types'

const EMPTY_TREE: Tree = { persons: [], relationships: [] }
const CHAT_COLLAPSED_KEY = 'ai_jiapu_chat_collapsed'

const ROLE_LABEL: Record<FamilyRole, string> = {
  owner: '创建者',
  editor: '编辑者',
  viewer: '只读',
}

const ROLE_COLOR: Record<FamilyRole, string> = {
  owner: '#a94438',
  editor: '#8a7355',
  viewer: 'default',
}

export default function App() {
  const { message } = AntdApp.useApp()
  const sessionRef = useRef(0)
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [families, setFamilies] = useState<Family[]>([])
  const [activeFamilyId, setActiveFamilyId] = useState<number | null>(null)
  const [tree, setTree] = useState<Tree>(EMPTY_TREE)
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Person | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(
    () => localStorage.getItem(CHAT_COLLAPSED_KEY) === '1',
  )

  const activeFamily = families.find((f) => f.id === activeFamilyId) ?? null
  const canEdit = activeFamily?.role === 'owner' || activeFamily?.role === 'editor'

  useEffect(() => {
    localStorage.setItem(CHAT_COLLAPSED_KEY, chatCollapsed ? '1' : '0')
  }, [chatCollapsed])

  const resetToGuest = useCallback(() => {
    sessionRef.current += 1
    setUser(null)
    setFamilies([])
    setActiveFamilyId(null)
    setTree(EMPTY_TREE)
    setMessages([])
    setSelected(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(resetToGuest)
    return () => setUnauthorizedHandler(null)
  }, [resetToGuest])

  const refreshFamilies = useCallback(async () => {
    const list = await getFamilies()
    setFamilies(list)
    return list
  }, [])

  const loadFamilyData = useCallback(async (familyId: number) => {
    const [nextTree, history] = await Promise.all([
      getTree(familyId),
      getHistory(familyId),
    ])
    setTree(nextTree)
    setMessages(history)
    setSelected(null)
    setLoadError(null)
  }, [])

  const selectFamily = useCallback(
    async (familyId: number) => {
      sessionRef.current += 1
      setActiveFamilyId(familyId)
      setBusy(false)
      setTree(EMPTY_TREE)
      setMessages([])
      try {
        await loadFamilyData(familyId)
      } catch (error) {
        setLoadError((error as Error).message)
      }
    },
    [loadFamilyData],
  )

  useEffect(() => {
    async function init() {
      if (!getToken()) {
        setInitializing(false)
        return
      }
      try {
        const [currentUser, list] = await Promise.all([me(), getFamilies()])
        setUser(currentUser)
        setFamilies(list)
        if (list.length > 0) await selectFamily(list[0].id)
      } catch {
        resetToGuest()
      } finally {
        setInitializing(false)
      }
    }
    void init()
  }, [resetToGuest, selectFamily])

  async function handleAuth(data: AuthResponse) {
    sessionRef.current += 1
    setToken(data.token)
    setUser(data.user)
    const list = await refreshFamilies()
    if (list.length > 0) await selectFamily(list[0].id)
  }

  async function handleCreated(family: Family) {
    await refreshFamilies()
    await selectFamily(family.id)
    message.success(`「${family.name}」已创建`)
  }

  async function handleJoined(family: Family) {
    await refreshFamilies()
    await selectFamily(family.id)
    message.success(`你已加入「${family.name}」（编辑成员）`)
  }

  async function handleFamilyDeleted() {
    setShowMembers(false)
    const list = await refreshFamilies()
    if (list.length > 0) {
      await selectFamily(list[0].id)
    } else {
      setActiveFamilyId(null)
      setTree(EMPTY_TREE)
      setMessages([])
    }
  }

  async function handleLogout() {
    try {
      await apiLogout()
    } catch {
      // 本地照常退出
    }
    clearToken()
    resetToGuest()
  }

  const handleSend = useCallback(
    async (text: string) => {
      if (activeFamilyId == null) return
      const session = sessionRef.current
      const optimistic: UiMessage = { id: -Date.now(), role: 'user', content: text }
      setMessages((prev) => [...prev, optimistic])
      setBusy(true)
      try {
        const result = await sendChat(activeFamilyId, text)
      if (sessionRef.current !== session) return
      setTree(result.tree)
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'assistant', content: result.reply },
      ])
      setSelected(null)
      } catch (error) {
      if (sessionRef.current !== session) return
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'assistant', content: `⚠️ ${(error as Error).message}` },
      ])
      } finally {
        setBusy(false)
      }
    },
    [activeFamilyId],
  )

  const handleSave = useCallback(
    async (id: number, patch: PersonUpdate) => {
      if (activeFamilyId == null) return
      try {
        await updatePerson(activeFamilyId, id, patch)
        await loadFamilyData(activeFamilyId)
        setSelected(null)
        message.success('成员信息已更新')
      } catch (error) {
        message.error(`保存失败：${(error as Error).message}`)
      }
    },
    [activeFamilyId, loadFamilyData, message],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      if (activeFamilyId == null) return
      try {
        await deletePerson(activeFamilyId, id)
        await loadFamilyData(activeFamilyId)
        setSelected(null)
        message.success('成员及其关系已删除')
      } catch (error) {
        message.error(`删除失败：${(error as Error).message}`)
      }
    },
    [activeFamilyId, loadFamilyData, message],
  )

  async function handleReset() {
    if (activeFamilyId == null) return
    try {
      await resetTree(activeFamilyId)
      await loadFamilyData(activeFamilyId)
      message.success('当前家谱与聊天记录已清空')
    } catch (error) {
      message.error(`清空失败：${(error as Error).message}`)
    }
  }

  if (initializing) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onAuth={(data) => void handleAuth(data)} />
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/60 px-4 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <TreePine className="size-4.5" />
          </div>
          <h1 className="font-heading text-lg tracking-wide">AI 家谱</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeFamily && (
            <>
              <Select
                value={activeFamily.id}
                onChange={(id) => void selectFamily(id)}
                options={families.map((family) => ({
                  label: family.name,
                  value: family.id,
                }))}
                style={{ width: 176 }}
                popupMatchSelectWidth={false}
              />
              <Tag color={ROLE_COLOR[activeFamily.role]} className="m-0">
                {ROLE_LABEL[activeFamily.role]}
              </Tag>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {tree.persons.length} 位成员
              </span>
            </>
          )}
          <Button size="small" type="text" icon={<Plus />} onClick={() => setShowCreate(true)}>
            创建
          </Button>
          <Button size="small" type="text" icon={<UserPlus />} onClick={() => setShowJoin(true)}>
            加入
          </Button>
          {activeFamily?.role === 'owner' && (
            <Button size="small" type="text" icon={<Users />} onClick={() => setShowMembers(true)}>
              成员
            </Button>
          )}
          {canEdit && (
            <Popconfirm
              title="清空当前家谱？"
              description="家谱与聊天记录都会被删除，此操作不可恢复。"
              okText="清空"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => void handleReset()}
            >
              <Button size="small" type="text" icon={<RotateCcw />}>
                清空重建
              </Button>
            </Popconfirm>
          )}
          <Dropdown
            menu={{
              items: [
                { key: 'settings', icon: <Settings />, label: '设置' },
                { type: 'divider' },
                { key: 'logout', icon: <LogOut />, label: '退出登录', danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'settings') setShowSettings(true)
                if (key === 'logout') void handleLogout()
              },
            }}
          >
            <Button size="small" type="text" className="gap-1.5 px-1.5">
              <Avatar size="small" style={{ background: '#a94438' }}>
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
              <span className="hidden max-w-24 truncate md:inline">{user.username}</span>
            </Button>
          </Dropdown>
        </div>
      </header>

      {loadError && (
        <Alert
          type="error"
          showIcon
          className="mx-6 mt-4 max-w-xl"
          message="加载失败"
          description={loadError}
        />
      )}

      <main className="flex min-h-0 flex-1">
        {families.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
            <TreePine className="size-12 text-primary/60" />
            <p className="text-base font-medium text-foreground">还没有家谱</p>
            <p className="max-w-sm text-sm leading-relaxed">
              点击右上角「创建」新建一个家谱，或输入家人分享的邀请码「加入」。
            </p>
          </div>
        ) : (
          <FamilyTreeCanvas tree={tree} onSelect={setSelected} />
        )}
        {chatCollapsed ? (
          <FloatButton
            icon={<MessageSquareText />}
            tooltip="展开对话"
            onClick={() => setChatCollapsed(false)}
          />
        ) : (
          <ChatPanel
            messages={messages}
            busy={busy}
            onSend={handleSend}
            disabled={!canEdit}
            noFamily={!activeFamily}
            onToggle={() => setChatCollapsed(true)}
          />
        )}
      </main>

      <CreateFamilyDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(family) => void handleCreated(family)}
      />
      <JoinFamilyDialog
        open={showJoin}
        onOpenChange={setShowJoin}
        onJoined={(family) => void handleJoined(family)}
      />
      {activeFamily?.role === 'owner' && (
        <MembersDialog
          family={activeFamily}
          open={showMembers}
          onOpenChange={setShowMembers}
          onFamilyDeleted={() => void handleFamilyDeleted()}
        />
      )}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      {selected && activeFamilyId != null && (
        <PersonDetail
          key={selected.id}
          person={selected}
          familyId={activeFamilyId}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          readOnly={!canEdit}
        />
      )}
    </div>
  )
}
