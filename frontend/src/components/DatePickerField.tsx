import { useState, type KeyboardEvent } from 'react'
import { zhCN } from 'date-fns/locale'
import { CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatDate, normalizeDateInput, parseDateString } from '@/lib/date'

const YEAR_FROM = 1800

interface DatePickerFieldProps {
  id: string
  value: string | null
  placeholder?: string
  onChange: (value: string | null) => void
}

export function DatePickerField({
  id,
  value,
  placeholder = '2025-08-16',
  onChange,
}: DatePickerFieldProps) {
  const [text, setText] = useState(value ?? '')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const selected = value ? parseDateString(value) : undefined

  function commit(raw: string) {
    const result = normalizeDateInput(raw)
    setError(result.error)
    setText(result.value ?? raw)
    onChange(result.value)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit(text)
      event.currentTarget.blur()
    }
  }

  function handleSelect(date: Date | undefined) {
    const formatted = date ? formatDate(date) : null
    onChange(formatted)
    setText(formatted ?? '')
    setError(null)
    setOpen(false)
  }

  function handleClear() {
    onChange(null)
    setText('')
    setError(null)
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Input
          id={id}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            if (error) setError(null)
          }}
          onBlur={() => commit(text)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          className="h-8"
        />
        {error && <FieldError>{error}</FieldError>}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-9 shrink-0 p-0"
            aria-label="打开日历选择日期"
          >
            <CalendarIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-1">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={zhCN}
            captionLayout="dropdown"
            startMonth={new Date(YEAR_FROM, 0)}
            endMonth={new Date(new Date().getFullYear(), 11)}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={handleClear}
          aria-label="清除日期"
        >
          <X />
        </Button>
      )}
    </div>
  )
}
