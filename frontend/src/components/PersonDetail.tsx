import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpenText, Plus, Trash2 } from 'lucide-react'
import {
  App as AntdApp,
  Button,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  type FormInstance,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import {
  createStory,
  deleteStory,
  getStories,
  updateStory,
} from '../api'
import type { Gender, Person, PersonUpdate, Story } from '../types'

interface PersonDetailProps {
  person: Person
  familyId: number
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
  biography?: string
  note?: string
}

interface StoryFormValues {
  title: string
  content: string
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
  familyId,
  onClose,
  onSave,
  onDelete,
  readOnly = false,
}: PersonDetailProps) {
  const { message } = AntdApp.useApp()
  const [stories, setStories] = useState<Story[]>([])
  const [storiesLoading, setStoriesLoading] = useState(true)
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [storyBusy, setStoryBusy] = useState(false)
  const storyFormRef = useRef<FormInstance<StoryFormValues> | null>(null)

  const loadStories = useCallback(async () => {
    setStoriesLoading(true)
    try {
      setStories(await getStories(familyId, person.id))
    } catch (error) {
      message.error(`故事加载失败：${(error as Error).message}`)
    } finally {
      setStoriesLoading(false)
    }
  }, [familyId, person.id, message])

  useEffect(() => {
    void loadStories()
  }, [loadStories])

  function handleFinish(values: PersonFormValues) {
    onSave(person.id, {
      name: values.name.trim(),
      gender: values.gender,
      birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
      death_date: values.death_date ? values.death_date.format('YYYY-MM-DD') : null,
      biography: values.biography?.trim() ?? '',
      note: values.note?.trim() ?? '',
    })
  }

  async function handleStorySave(values: StoryFormValues) {
    setStoryBusy(true)
    try {
      if (editingStory) {
        await updateStory(familyId, person.id, editingStory.id, {
          title: values.title.trim(),
          content: values.content.trim(),
        })
        message.success('故事已更新')
      } else {
        await createStory(familyId, person.id, values.title.trim(), values.content.trim())
        message.success('故事已添加')
      }
      setShowStoryModal(false)
      setEditingStory(null)
      await loadStories()
    } catch (error) {
      message.error(`保存失败：${(error as Error).message}`)
    } finally {
      setStoryBusy(false)
    }
  }

  async function handleStoryDelete(story: Story) {
    try {
      await deleteStory(familyId, person.id, story.id)
      message.success('故事已删除')
      await loadStories()
    } catch (error) {
      message.error(`删除失败：${(error as Error).message}`)
    }
  }

  const storiesSection = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <BookOpenText className="size-4 text-primary" />
          家族故事
          {!storiesLoading && <span className="text-muted-foreground">（{stories.length}）</span>}
        </span>
        {!readOnly && (
          <Button
            size="small"
            type="primary"
            ghost
            icon={<Plus />}
            onClick={() => {
              setEditingStory(null)
              setShowStoryModal(true)
            }}
          >
            添加故事
          </Button>
        )}
      </div>
      {storiesLoading ? (
        <div className="flex justify-center py-4">
          <Spin size="small" />
        </div>
      ) : stories.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span className="text-xs text-muted-foreground">还没有故事，点击「添加故事」或直接告诉 AI 助手</span>}
        />
      ) : (
        <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
          {stories.map((story) => (
            <li key={story.id} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{story.title}</span>
                {!readOnly && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="small"
                      type="text"
                      onClick={() => {
                        setEditingStory(story)
                        setShowStoryModal(true)
                      }}
                    >
                      编辑
                    </Button>
                    <Popconfirm
                      title="删除这个故事？"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => void handleStoryDelete(story)}
                    >
                      <Button size="small" type="text" danger icon={<Trash2 />} aria-label={`删除故事 ${story.title}`} />
                    </Popconfirm>
                  </div>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {story.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  if (readOnly) {
    return (
      <Modal
        open
        title={person.name}
        footer={null}
        onCancel={onClose}
        width={520}
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
      >
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
            <dt className="w-20 shrink-0 text-muted-foreground">生平</dt>
            <dd className="whitespace-pre-wrap">{person.biography || '未记录'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted-foreground">备注</dt>
            <dd className="whitespace-pre-wrap">{person.note || '无'}</dd>
          </div>
        </dl>
        <Divider className="my-4" />
        {storiesSection}
      </Modal>
    )
  }

  return (
    <>
      <Modal
        open
        title="成员详情"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Popconfirm
              title={`删除 ${person.name}？`}
              description="该成员及其所有关系、故事都会被删除，此操作不可恢复。"
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
            </Popconfirm>
            <Button type="primary" htmlType="submit" form="person-form">
              保存
            </Button>
          </div>
        }
        onCancel={onClose}
        width={520}
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
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
            biography: person.biography,
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
          <Form.Item label="生平" name="biography" extra="可让 AI 助手帮忙整理：在对话里说「整理一下张伟的生平」。">
            <Input.TextArea rows={5} placeholder="记录这位成员的生平：出生、成长、事业、晚年…" />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={3} placeholder="职业、居住地等其他信息" />
          </Form.Item>
        </Form>
        <Divider className="my-4" />
        {storiesSection}
      </Modal>

      <Modal
        open={showStoryModal}
        title={editingStory ? '编辑故事' : '添加故事'}
        okText={editingStory ? '保存' : '添加'}
        cancelText="取消"
        confirmLoading={storyBusy}
        onOk={() => storyFormRef.current?.submit()}
        onCancel={() => {
          setShowStoryModal(false)
          setEditingStory(null)
        }}
        destroyOnHidden
      >
        <StoryForm key={editingStory?.id ?? 'new'} story={editingStory} formRef={storyFormRef} onFinish={(v) => void handleStorySave(v)} />
      </Modal>
    </>
  )
}

// 为故事表单绑定 Form 实例，便于 Modal 的 onOk 触发提交
function StoryForm({
  story,
  formRef,
  onFinish,
}: {
  story: Story | null
  formRef: React.RefObject<FormInstance<StoryFormValues> | null>
  onFinish: (values: StoryFormValues) => void
}) {
  const [form] = Form.useForm<StoryFormValues>()
  formRef.current = form
  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={story ? { title: story.title, content: story.content } : undefined}
      onFinish={onFinish}
    >
      <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入故事标题' }]}>
        <Input maxLength={100} placeholder="例如：年少学艺、迁居故事" />
      </Form.Item>
      <Form.Item label="内容" name="content" rules={[{ required: true, message: '请输入故事内容' }]}>
        <Input.TextArea rows={6} placeholder="写下这段故事…" />
      </Form.Item>
    </Form>
  )
}
