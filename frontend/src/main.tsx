import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App'
import './styles.css'

dayjs.locale('zh-cn')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#a94438',
          colorInfo: '#a94438',
          colorText: '#4a2c17',
          colorTextSecondary: '#8a7355',
          colorTextPlaceholder: '#a2947e',
          colorBgContainer: '#fffdf7',
          colorBgElevated: '#fffdf7',
          colorBorder: '#d8c9a8',
          colorBorderSecondary: '#e4d8bd',
          borderRadius: 8,
          fontFamily:
            "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
        },
        components: {
          Button: { controlHeight: 32 },
          Input: { controlHeight: 32 },
          Select: { controlHeight: 32 },
          DatePicker: { controlHeight: 32 },
          Modal: { borderRadiusLG: 12 },
        },
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
