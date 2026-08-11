import { describe, expect, it } from 'vitest'
import { formatDate, normalizeDateInput, parseDateString } from '../lib/date'

describe('normalizeDateInput', () => {
  it('接受标准格式', () => {
    expect(normalizeDateInput('2025-08-16')).toEqual({
      value: '2025-08-16',
      error: null,
    })
  })

  it('自动补零（2025-8-6 → 2025-08-06）', () => {
    expect(normalizeDateInput('2025-8-6')).toEqual({
      value: '2025-08-06',
      error: null,
    })
  })

  it('拒绝不存在的日期（2025-02-30）', () => {
    const result = normalizeDateInput('2025-02-30')
    expect(result.value).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('拒绝错误格式（2025年8月16日）', () => {
    const result = normalizeDateInput('2025年8月16日')
    expect(result.value).toBeNull()
    expect(result.error).toContain('YYYY-MM-DD')
  })

  it('空输入返回 null', () => {
    expect(normalizeDateInput('   ')).toEqual({ value: null, error: null })
  })
})

describe('parseDateString / formatDate', () => {
  it('往返转换保持一致', () => {
    const date = parseDateString('1990-05-12')
    expect(date).toBeDefined()
    expect(formatDate(date!)).toBe('1990-05-12')
  })

  it('非法字符串返回 undefined', () => {
    expect(parseDateString('2025/08/16')).toBeUndefined()
  })
})
