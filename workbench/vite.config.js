import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true, // 确保启用 Source Map
  },
  plugins: [vue()],
  resolve: {
    alias: [{ find: '@', replacement: path.resolve(__dirname, './src') }]
  },
  server: {
    host: '0.0.0.0',
    port: 9090,
    proxy: {
      '^/api': {
        target: 'http://localhost:9222/',
        changeOrigin: true
      },
      '^/static': {
        target: 'http://localhost:9222/',
        changeOrigin: true
      }
    }
  }
})
