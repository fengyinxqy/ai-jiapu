import { DatePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

interface DatePickerFieldProps {
  id: string
  value: string | null
  placeholder?: string
  onChange: (value: string | null) => void
}

/**
 * Element Plus 风格日期选择器（antd DatePicker）：
 * - 支持键盘直接输入 YYYY-MM-DD
 * - 点击输入框弹出日历，点击顶部年份/月份可进入快速选年/选月面板
 */
export function DatePickerField({
  id,
  value,
  placeholder = '2025-08-16',
  onChange,
}: DatePickerFieldProps) {
  function handleChange(date: Dayjs | null) {
    onChange(date ? date.format('YYYY-MM-DD') : null)
  }

  return (
    <DatePicker
      id={id}
      value={value ? dayjs(value) : null}
      onChange={handleChange}
      placeholder={placeholder}
      format="YYYY-MM-DD"
      allowClear
      style={{ width: '100%' }}
      popupClassName="ai-jiapu-datepicker-popup"
    />
  )
}
