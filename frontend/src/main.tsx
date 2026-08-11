import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#a94438',
          colorText: '#4a2c17',
          colorBgContainer: '#fffdf7',
          colorBorder: '#d8c9a8',
          colorTextPlaceholder: '#8a7355',
          borderRadius: 8,
          fontFamily:
            "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)
