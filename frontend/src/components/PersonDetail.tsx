import { useState, type FormEvent } from 'react'
import { zhCN } from 'date-fns/locale'
import { CalendarIcon, Trash2, X } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Gender, Person, PersonUpdate } from '../types'

interface PersonDetailProps {
  person: Person
  onClose: () => void
  onSave: (id: number, patch: PersonUpdate) => void
  onDelete: (id: number) => void
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' },
]

function parseDateString(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface DatePickerFieldProps {
  id: string
  value: string | null
  placeholder: string
  onChange: (value: string | null) => void
}

function DatePickerField({ id, value, placeholder, onChange }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseDateString(value) : undefined

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="h-8 w-full justify-start font-normal"
          >
            <CalendarIcon data-icon="inline-start" />
            {value ? value : <span className="text-muted-foreground">{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-1">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              onChange(date ? formatDate(date) : null)
              setOpen(false)
            }}
            locale={zhCN}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange(null)}
          aria-label="清除日期"
        >
          <X />
        </Button>
      )}
    </div>
  )
}

export function PersonDetail({ person, onClose, onSave, onDelete }: PersonDetailProps) {
  const [name, setName] = useState(person.name)
  const [gender, setGender] = useState<Gender>(person.gender)
  const [birthDate, setBirthDate] = useState<string | null>(person.birth_date)
  const [deathDate, setDeathDate] = useState<string | null>(person.death_date)
  const [note, setNote] = useState(person.note ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    onSave(person.id, {
      name: name.trim(),
      gender,
      birth_date: birthDate,
      death_date: deathDate,
      note: note.trim(),
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>成员详情</DialogTitle>
          <DialogDescription>编辑 {person.name} 的资料，保存后家谱会同步更新。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="person-name">姓名</FieldLabel>
              <Input
                id="person-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={100}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="person-gender">性别</FieldLabel>
              <Select value={gender} onValueChange={(value) => setGender(value as Gender)}>
                <SelectTrigger id="person-gender" className="w-full">
                  <SelectValue placeholder="选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="person-birth">出生日期</FieldLabel>
              <DatePickerField
                id="person-birth"
                value={birthDate}
                placeholder="选择出生日期"
                onChange={setBirthDate}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="person-death">去世日期</FieldLabel>
              <DatePickerField
                id="person-death"
                value={deathDate}
                placeholder="选择去世日期"
                onChange={setDeathDate}
              />
              <FieldDescription>留空表示在世。</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="person-note">备注</FieldLabel>
              <Textarea
                id="person-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="职业、居住地、生平故事等"
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 data-icon="inline-start" />
                  删除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>删除 {person.name}？</AlertDialogTitle>
                  <AlertDialogDescription>
                    该成员及其所有关系都会被删除，此操作不可恢复。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(person.id)}>
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
