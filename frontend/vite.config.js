import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy API calls to FastAPI backend during development
    proxy: {
      '/train':            'http://localhost:8000',
      '/introduce_noise':  'http://localhost:8000',
      '/adapt':            'http://localhost:8000',
      '/reset':            'http://localhost:8000',
      '/metrics':          'http://localhost:8000',
      '/set_user':         'http://localhost:8000',
    }
  }
})
