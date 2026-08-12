import { useState } from 'react'
import { App as AntdApp, Form, Input, Modal } from 'antd'
import { changePassword } from '../api'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SettingsFormValues {
  old_password: string
  new_password: string
  confirm: string
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<SettingsFormValues>()
  const [busy, setBusy] = useState(false)

  async function handleFinish(values: SettingsFormValues) {
    setBusy(true)
    try {
      await changePassword(values.old_password, values.new_password)
      form.resetFields()
      onOpenChange(false)
      message.success('密码已修改')
    } catch (error) {
      message.error(`修改失败：${(error as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="设置"
      okText="保存"
      cancelText="取消"
      confirmLoading={busy}
      onOk={() => form.submit()}
      onCancel={() => onOpenChange(false)}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          label="原密码"
          name="old_password"
          rules={[{ required: true, message: '请输入原密码' }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          label="新密码"
          name="new_password"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '新密码至少 6 位' },
          ]}
        >
          <Input.Password placeholder="至少 6 位" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="确认新密码"
          name="confirm"
          dependencies={['new_password']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('两次输入的新密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
