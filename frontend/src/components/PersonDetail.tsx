import { Trash2 } from 'lucide-react'
import { Button, DatePicker, Form, Input, Modal, Popconfirm, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import type { Gender, Person, PersonUpdate } from '../types'

interface PersonDetailProps {
  person: Person
  onClose: () => void
  onSave: (id: number, patch: PersonUpdate) => void
  onDelete: (id: number) => void
  readOnly?: boolean
}

interface PersonFormValues {
  name: string
  gender: Gender
  birth_date?: Dayjs | null
  death_date?: Dayjs | null
  note?: string
}

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' },
]

const GENDER_LABEL: Record<Gender, string> = {
  male: '男',
  female: '女',
  unknown: '未知',
}

export function PersonDetail({
  person,
  onClose,
  onSave,
  onDelete,
  readOnly = false,
}: PersonDetailProps) {
  function handleFinish(values: PersonFormValues) {
    onSave(person.id, {
      name: values.name.trim(),
      gender: values.gender,
      birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
      death_date: values.death_date ? values.death_date.format('YYYY-MM-DD') : null,
      note: values.note?.trim() ?? '',
    })
  }

  if (readOnly) {
    return (
      <Modal open title={person.name} footer={null} onCancel={onClose} width={440}>
        <p className="mb-4 text-sm text-muted-foreground">你以只读身份查看成员资料。</p>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted-foreground">性别</dt>
            <dd>{GENDER_LABEL[person.gender]}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted-foreground">出生日期</dt>
            <dd>{person.birth_date ?? '未知'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted-foreground">去世日期</dt>
            <dd>{person.death_date ?? '在世'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted-foreground">备注</dt>
            <dd className="whitespace-pre-wrap">{person.note || '无'}</dd>
          </div>
        </dl>
      </Modal>
    )
  }

  return (
    <Modal
      open
      title="成员详情"
      footer={[
        <Popconfirm
          key="delete"
          title={`删除 ${person.name}？`}
          description="该成员及其所有关系都会被删除，此操作不可恢复。"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => {
            onDelete(person.id)
          }}
        >
          <Button danger icon={<Trash2 />}>
            删除
          </Button>
        </Popconfirm>,
        <Button key="save" type="primary" htmlType="submit" form="person-form">
          保存
        </Button>,
      ]}
      onCancel={onClose}
      width={480}
    >
      <Form<PersonFormValues>
        id="person-form"
        layout="vertical"
        requiredMark={false}
        initialValues={{
          name: person.name,
          gender: person.gender,
          birth_date: person.birth_date ? dayjs(person.birth_date) : null,
          death_date: person.death_date ? dayjs(person.death_date) : null,
          note: person.note,
        }}
        onFinish={handleFinish}
      >
        <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item label="性别" name="gender">
          <Select options={GENDER_OPTIONS} />
        </Form.Item>
        <Form.Item label="出生日期" name="birth_date">
          <DatePicker style={{ width: '100%' }} placeholder="2025-08-16" allowClear />
        </Form.Item>
        <Form.Item label="去世日期" name="death_date" extra="留空表示在世。">
          <DatePicker style={{ width: '100%' }} placeholder="2025-08-16" allowClear />
        </Form.Item>
        <Form.Item label="备注" name="note">
          <Input.TextArea rows={4} placeholder="职业、居住地、生平故事等" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
