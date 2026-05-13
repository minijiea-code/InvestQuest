import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/dart-api': {
        target: 'https://opendart.fss.or.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dart-api/, '/api'),
        secure: false,
      },
    },
  },
})
