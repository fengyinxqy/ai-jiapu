import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, TreePine, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { deletePerson, getHistory, getTree, resetTree, sendChat, updatePerson } from './api'
import { ChatPanel } from './components/ChatPanel'
import { FamilyTreeCanvas } from './components/FamilyTreeCanvas'
import { PersonDetail } from './components/PersonDetail'
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
import { Toaster } from '@/components/ui/sonner'
import type { Person, PersonUpdate, Tree, UiMessage } from './types'

const EMPTY_TREE: Tree = { persons: [], relationships: [] }

export default function App() {
  const [tree, setTree] = useState<Tree>(EMPTY_TREE)
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Person | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [nextTree, history] = await Promise.all([getTree(), getHistory()])
    setTree(nextTree)
    setMessages(history)
  }, [])

  useEffect(() => {
    refresh().catch((error: Error) => setLoadError(error.message))
  }, [refresh])

  const handleSend = useCallback(async (text: string) => {
    const optimistic: UiMessage = { id: -Date.now(), role: 'user', content: text }
    setMessages((prev) => [...prev, optimistic])
    setBusy(true)
    try {
      const result = await sendChat(text)
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
  }, [])

  const handleSave = useCallback(
    async (id: number, patch: PersonUpdate) => {
      try {
        await updatePerson(id, patch)
        await refresh()
        setSelected(null)
        toast.success('已保存', { description: '成员信息已更新。' })
      } catch (error) {
        toast.error('保存失败', { description: (error as Error).message })
      }
    },
    [refresh],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deletePerson(id)
        await refresh()
        setSelected(null)
        toast.success('已删除', { description: '成员及其关系已从家谱移除。' })
      } catch (error) {
        toast.error('删除失败', { description: (error as Error).message })
      }
    },
    [refresh],
  )

  const handleReset = useCallback(async () => {
    try {
      await resetTree()
      setTree(EMPTY_TREE)
      setMessages([])
      setSelected(null)
      toast.success('已清空', { description: '家谱与聊天记录已重置。' })
    } catch (error) {
      toast.error('清空失败', { description: (error as Error).message })
    }
  }, [])

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-secondary/60 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <TreePine className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl tracking-wide">AI 家谱</h1>
            <p className="text-xs text-muted-foreground">对话式家族谱系整理</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{tree.persons.length} 位成员</Badge>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <RotateCcw data-icon="inline-start" />
                清空重建
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>清空整个家谱？</AlertDialogTitle>
                <AlertDialogDescription>
                  家谱与聊天记录都会被删除，此操作不可恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>清空</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
        <FamilyTreeCanvas tree={tree} onSelect={setSelected} />
        <ChatPanel messages={messages} busy={busy} onSend={handleSend} />
      </main>
      {selected && (
        <PersonDetail
          key={selected.id}
          person={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
      <Toaster richColors position="top-center" />
    </div>
  )
}
