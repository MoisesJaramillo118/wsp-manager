import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  server: {
    proxy: {
      '/wsp-api': {
        target: 'http://127.0.0.1:3006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wsp-api/, ''),
      },
    },
  },
})
