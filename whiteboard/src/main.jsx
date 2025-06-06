import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/app/App'
import './index.less'
import store from '@/store'
import { message } from 'antd'
import { imgToDataURL } from '@/utils'

const render = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

const init = async () => {
  const match = location.pathname.match(/^\/whiteboard\/([^/]+)$/)
  if (!match) {
    message.error('页面参数有误')
    return
  }
  const id = match[1]
  try {
    const userInfo = await store.methods.getUserInfo()
    if (!userInfo) {
      location.href = '/login'
    }
  } catch (error) {
    console.log(error)
    location.href = '/login'
  }
  try {
    const fileData = await store.methods.getFileData(id)
    if (!fileData) {
      message.error('文件内容获取失败，请刷新重试')
    } else {
      await loadImages(fileData)
      render()
    }
  } catch (error) {
    console.log(error)
    message.error('文件内容获取失败，请刷新重试')
  }
}

// 预加载图片资源，否则第一次无法显示
const loadImages = async fileData => {
  try {
    if (fileData.content && fileData.content.files) {
      const files = fileData.content.files
      const tasks = Object.keys(files).map(key => {
        return new Promise(async (resolve, reject) => {
          const item = files[key]
          if (/^data:/.test(item.dataURL)) {
            resolve()
          } else {
            try {
              const res = await imgToDataURL(item.dataURL)
              item.uploadURL = item.dataURL
              item.dataURL = res
              resolve()
            } catch (e) {
              reject(e)
            }
          }
        })
      })
      await Promise.all(tasks)
    }
  } catch (e) {
    message.error('资源加载失败，请刷新重试')
  }
}

init()
