import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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

function parseYear(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const year = Number(trimmed)
  return Number.isInteger(year) && year > 0 && year < 3000 ? year : null
}

export function PersonDetail({ person, onClose, onSave, onDelete }: PersonDetailProps) {
  const [name, setName] = useState(person.name)
  const [gender, setGender] = useState<Gender>(person.gender)
  const [birthYear, setBirthYear] = useState(person.birth_year?.toString() ?? '')
  const [deathYear, setDeathYear] = useState(person.death_year?.toString() ?? '')
  const [note, setNote] = useState(person.note ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    onSave(person.id, {
      name: name.trim(),
      gender,
      birth_year: parseYear(birthYear),
      death_year: parseYear(deathYear),
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
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="person-birth">出生年</FieldLabel>
                <Input
                  id="person-birth"
                  value={birthYear}
                  onChange={(event) => setBirthYear(event.target.value)}
                  placeholder="如 1990"
                  inputMode="numeric"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="person-death">去世年</FieldLabel>
                <Input
                  id="person-death"
                  value={deathYear}
                  onChange={(event) => setDeathYear(event.target.value)}
                  placeholder="留空为在世"
                  inputMode="numeric"
                />
              </Field>
            </div>
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
