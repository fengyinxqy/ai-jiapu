import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatPanel } from '../components/ChatPanel'
import type { UiMessage } from '../types'

const messages: UiMessage[] = [
  { id: 1, role: 'user', content: '我叫张伟' },
  { id: 2, role: 'assistant', content: '已添加张伟。' },
]

describe('ChatPanel', () => {
  it('展示消息并发送输入', () => {
    const onSend = vi.fn()
    render(<ChatPanel messages={messages} busy={false} onSend={onSend} />)
    expect(screen.getByText('我叫张伟')).toBeInTheDocument()
    expect(screen.getByText('已添加张伟。')).toBeInTheDocument()

    const input = screen.getByLabelText('消息输入框')
    fireEvent.change(input, { target: { value: '我母亲叫李秀兰' } })
    fireEvent.submit(input.closest('form')!)
    expect(onSend).toHaveBeenCalledWith('我母亲叫李秀兰')
  })

  it('渲染 Markdown 格式（加粗与列表）', () => {
    const markdownMessages: UiMessage[] = [
      {
        id: 3,
        role: 'assistant',
        content: '新增成员：**萧祺彦**（你）\n\n- 建立亲子关系\n- 肖开荣 → 萧祺彦',
      },
    ]
    const { container } = render(
      <ChatPanel messages={markdownMessages} busy={false} onSend={vi.fn()} />,
    )
    const strong = container.querySelector('.chat-msg__bubble strong')
    expect(strong).toHaveTextContent('萧祺彦')
    expect(container.querySelectorAll('.chat-msg__bubble li')).toHaveLength(2)
  })
})
