import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { App as AntdApp } from 'antd'

/**
 * 用 antd <App> 包裹渲染，为使用 AntdApp.useApp()（message / notification）
 * 的组件提供上下文。无该上下文时 useApp 会直接抛错。
 */
export function renderWithApp(ui: ReactElement) {
  return render(<AntdApp>{ui}</AntdApp>)
}
