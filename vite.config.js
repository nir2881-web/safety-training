import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/safety-training/',
  plugins: [react()],
  optimizeDeps: {
    include: ['mammoth', 'jszip', 'xlsx']
  }
})
