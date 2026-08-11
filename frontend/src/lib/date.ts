export function parseDateString(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface NormalizeResult {
  value: string | null
  error: string | null
}

/**
 * 规范化用户输入的日期文本：
 * - 空输入 → null
 * - "2025-8-6" 自动补零为 "2025-08-06"
 * - 非法日期或格式 → 返回错误信息
 */
export function normalizeDateInput(raw: string): NormalizeResult {
  const text = raw.trim()
  if (!text) return { value: null, error: null }

  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text)
  if (!match) {
    return { value: null, error: '请按 YYYY-MM-DD 格式输入，例如 2025-08-16' }
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { value: null, error: '日期不存在，请检查年月日是否正确' }
  }

  return { value: formatDate(date), error: null }
}
