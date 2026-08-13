import '@testing-library/jest-dom/vitest'
import { act } from '@testing-library/react'
import { afterEach } from 'vitest'

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class DOMMatrixReadOnlyMock {
  m11 = 1
  m12 = 0
  m13 = 0
  m14 = 0
  m21 = 0
  m22 = 1
  m23 = 0
  m24 = 0
  m31 = 0
  m32 = 0
  m33 = 1
  m34 = 0
  m41 = 0
  m42 = 0
  m43 = 0
  m44 = 1
  static fromMatrix() {
    return new DOMMatrixReadOnlyMock()
  }
  static fromString() {
    return new DOMMatrixReadOnlyMock()
  }
}

if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
  })
}

if (!('DOMMatrixReadOnly' in globalThis)) {
  Object.defineProperty(globalThis, 'DOMMatrixReadOnly', {
    value: DOMMatrixReadOnlyMock,
    writable: true,
  })
}

// jsdom 不支持伪元素查询，antd 内部（rc-util 测量滚动条）会传 pseudoElt
// 触发 "Not implemented" 报错，这里转发时忽略该参数。
if (typeof window !== 'undefined') {
  const originalGetComputedStyle = window.getComputedStyle.bind(window)
  window.getComputedStyle = (element: Element, pseudoElt?: string | null) =>
    originalGetComputedStyle(element, pseudoElt || undefined)
}

// antd Button 在 loading 结束时用 useDelayState 挂一个延迟更新定时器，该 hook
// 没有卸载清理；若测试环境销毁后才触发会抛 "window is not defined"。每个用例
// 结束后在 act 内等待 50ms，让这类延迟更新在环境存活期间执行完毕。
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
})
