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

  it('输入为空时发送按钮禁用', () => {
    render(<ChatPanel messages={[]} busy={false} onSend={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^发\s*送$/ })).toBeDisabled()
  })

  it('busy 时输入框禁用并展示打字动画', () => {
    const { container } = render(<ChatPanel messages={[]} busy onSend={vi.fn()} />)

    expect(screen.getByLabelText('消息输入框')).toBeDisabled()
    expect(screen.getByRole('button', { name: /^发\s*送$/ })).toBeDisabled()
    expect(screen.getByText('整理中…')).toBeInTheDocument()
    expect(container.querySelector('.chat-msg__bubble--typing')).toBeInTheDocument()
  })

  it('只读成员（disabled）输入禁用且展示只读提示', () => {
    render(<ChatPanel messages={[]} busy={false} disabled onSend={vi.fn()} />)

    expect(screen.getByLabelText('消息输入框')).toBeDisabled()
    expect(screen.getByPlaceholderText('只读成员不可发送消息')).toBeInTheDocument()
    expect(screen.getByText(/你以只读身份加入这个家谱/)).toBeInTheDocument()
  })

  it('无家谱时（noFamily）展示引导文案', () => {
    render(<ChatPanel messages={[]} busy={false} noFamily onSend={vi.fn()} />)

    expect(screen.getByLabelText('消息输入框')).toBeDisabled()
    expect(screen.getByPlaceholderText('先创建或加入家谱')).toBeInTheDocument()
    expect(screen.getByText('还没有家谱，先创建或加入一个吧。')).toBeInTheDocument()
  })
})
