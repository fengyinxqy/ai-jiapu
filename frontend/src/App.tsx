import { useCallback, useEffect, useState } from 'react'
import {
  LogOut,
  Plus,
  RotateCcw,
  Settings,
  TreePine,
  TriangleAlert,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
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

const ROLE_LABEL: Record<FamilyRole, string> = {
  owner: '创建者',
  editor: '编辑者',
  viewer: '只读',
}

const ROLE_BADGE: Record<FamilyRole, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  editor: 'secondary',
  viewer: 'outline',
}

export default function App() {
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

  const activeFamily = families.find((f) => f.id === activeFamilyId) ?? null
  const canEdit = activeFamily?.role === 'owner' || activeFamily?.role === 'editor'

  const resetToGuest = useCallback(() => {
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
    setToken(data.token)
    setUser(data.user)
    const list = await refreshFamilies()
    if (list.length > 0) await selectFamily(list[0].id)
  }

  async function handleCreated(family: Family) {
    await refreshFamilies()
    await selectFamily(family.id)
    toast.success('家谱已创建', { description: `「${family.name}」已就绪。` })
  }

  async function handleJoined(family: Family) {
    await refreshFamilies()
    await selectFamily(family.id)
    toast.success('已加入家谱', { description: `你已成为「${family.name}」的编辑成员。` })
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
      const optimistic: UiMessage = { id: -Date.now(), role: 'user', content: text }
      setMessages((prev) => [...prev, optimistic])
      setBusy(true)
      try {
        const result = await sendChat(activeFamilyId, text)
        setTree(result.tree)
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimistic.id),
          { id: Date.now(), role: 'assistant', content: result.reply },
        ])
        setSelected(null)
      } catch (error) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimistic.id),
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
        toast.success('已保存', { description: '成员信息已更新。' })
      } catch (error) {
        toast.error('保存失败', { description: (error as Error).message })
      }
    },
    [activeFamilyId, loadFamilyData],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      if (activeFamilyId == null) return
      try {
        await deletePerson(activeFamilyId, id)
        await loadFamilyData(activeFamilyId)
        setSelected(null)
        toast.success('已删除', { description: '成员及其关系已从家谱移除。' })
      } catch (error) {
        toast.error('删除失败', { description: (error as Error).message })
      }
    },
    [activeFamilyId, loadFamilyData],
  )

  async function handleReset() {
    if (activeFamilyId == null) return
    try {
      await resetTree(activeFamilyId)
      await loadFamilyData(activeFamilyId)
      toast.success('已清空', { description: '当前家谱与聊天记录已重置。' })
    } catch (error) {
      toast.error('清空失败', { description: (error as Error).message })
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
    return (
      <>
        <AuthPage onAuth={(data) => void handleAuth(data)} />
        <Toaster richColors position="top-center" />
      </>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/60 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <TreePine className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl tracking-wide">AI 家谱</h1>
            <p className="text-xs text-muted-foreground">你好，{user.username}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeFamily && (
            <>
              <Select
                value={String(activeFamily.id)}
                onValueChange={(value) => void selectFamily(Number(value))}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="选择家谱" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {families.map((family) => (
                      <SelectItem key={family.id} value={String(family.id)}>
                        {family.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Badge variant={ROLE_BADGE[activeFamily.role]}>
                {ROLE_LABEL[activeFamily.role]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {tree.persons.length} 位成员
              </span>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowCreate(true)}>
            <Plus data-icon="inline-start" />
            创建
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowJoin(true)}>
            <UserPlus data-icon="inline-start" />
            加入
          </Button>
          {activeFamily?.role === 'owner' && (
            <Button variant="ghost" size="sm" onClick={() => setShowMembers(true)}>
              <Users data-icon="inline-start" />
              成员
            </Button>
          )}
          {canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <RotateCcw data-icon="inline-start" />
                  清空重建
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>清空当前家谱？</AlertDialogTitle>
                  <AlertDialogDescription>
                    家谱与聊天记录都会被删除，此操作不可恢复。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleReset()}>清空</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
            <Settings data-icon="inline-start" />
            设置
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
            <LogOut data-icon="inline-start" />
            退出
          </Button>
        </div>
      </header>

      {loadError && (
        <Alert variant="destructive" className="mx-6 mt-4 max-w-xl">
          <TriangleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
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
        <ChatPanel
          messages={messages}
          busy={busy}
          onSend={handleSend}
          disabled={!canEdit}
        />
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
      {selected && (
        <PersonDetail
          key={selected.id}
          person={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          readOnly={!canEdit}
        />
      )}
      <Toaster richColors position="top-center" />
    </div>
  )
}
