import { useState } from 'react'
import { App as AntdApp, Form, Input, Modal } from 'antd'
import type { Family } from '../types'
import { createFamily, joinFamily } from '../api'

interface CreateFamilyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (family: Family) => void
}

export function CreateFamilyDialog({ open, onOpenChange, onCreated }: CreateFamilyDialogProps) {
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<{ name: string }>()
  const [busy, setBusy] = useState(false)

  async function handleFinish(values: { name: string }) {
    setBusy(true)
    try {
      const family = await createFamily(values.name.trim())
      form.resetFields()
      onOpenChange(false)
      onCreated(family)
    } catch (error) {
      message.error(`创建失败：${(error as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="创建家谱"
      okText="创建"
      cancelText="取消"
      confirmLoading={busy}
      onOk={() => form.submit()}
      onCancel={() => onOpenChange(false)}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          label="家谱名称"
          name="name"
          rules={[{ required: true, message: '请输入家谱名称' }]}
        >
          <Input placeholder="例如：张家家谱" maxLength={100} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

interface JoinFamilyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJoined: (family: Family) => void
}

export function JoinFamilyDialog({ open, onOpenChange, onJoined }: JoinFamilyDialogProps) {
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<{ code: string }>()
  const [busy, setBusy] = useState(false)

  async function handleFinish(values: { code: string }) {
    setBusy(true)
    try {
      const family = await joinFamily(values.code.trim().toUpperCase())
      form.resetFields()
      onOpenChange(false)
      onJoined(family)
    } catch (error) {
      message.error(`加入失败：${(error as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="加入家谱"
      okText="加入"
      cancelText="取消"
      confirmLoading={busy}
      onOk={() => form.submit()}
      onCancel={() => onOpenChange(false)}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          label="邀请码"
          name="code"
          rules={[{ required: true, message: '请输入邀请码' }]}
        >
          <Input
            placeholder="例如：A1B2C3"
            maxLength={16}
            style={{ textTransform: 'uppercase' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
