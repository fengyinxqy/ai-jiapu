import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { UiMessage } from '../types'

interface ChatPanelProps {
  messages: UiMessage[]
  busy: boolean
  onSend: (text: string) => void
  disabled?: boolean
  noFamily?: boolean
}

export function ChatPanel({
  messages,
  busy,
  onSend,
  disabled = false,
  noFamily = false,
}: ChatPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy || disabled) return
    onSend(text)
    setDraft('')
  }

  return (
    <section className="flex h-full w-[380px] flex-none flex-col bg-card">
      <header className="flex shrink-0 items-center justify-between px-4 py-2.5">
        <h2 className="font-heading text-sm font-semibold">与家谱助手对话</h2>
        <Badge variant={busy ? 'outline' : 'secondary'} className={busy ? 'animate-pulse' : ''}>
          {busy ? '整理中…' : '在线'}
        </Badge>
      </header>
      <Separator />
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && !busy && (
          <p className="m-auto max-w-[260px] text-center text-sm leading-relaxed text-muted-foreground">
            {noFamily
              ? '还没有家谱，先创建或加入一个吧。'
              : disabled
              ? '你以只读身份加入这个家谱，仅可查看成员与家谱图。'
              : '试试这样说：「我叫张伟，我父亲叫张建国，母亲叫李秀兰，爷爷叫张守义。」'}
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`chat-msg chat-msg--${message.role}`}>
            <div className="chat-msg__bubble">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {busy && (
          <div className="chat-msg chat-msg--assistant">
            <div className="chat-msg__bubble chat-msg__bubble--typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
      <Separator />
      <form className="flex shrink-0 gap-2 p-3" onSubmit={handleSubmit}>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            noFamily
              ? '先创建或加入家谱'
              : disabled
                ? '只读成员不可发送消息'
                : '口述你的家人，例如：我妈妈叫李秀兰…'
          }
          maxLength={2000}
          disabled={busy || disabled || noFamily}
          aria-label="消息输入框"
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={busy || disabled || noFamily || draft.trim() === ''}>
          <SendHorizontal data-icon="inline-start" />
          发送
        </Button>
      </form>
    </section>
  )
}
