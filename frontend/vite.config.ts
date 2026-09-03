import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    // Inject the API URL at build time. In production (Vercel), this ensures
    // the Render backend URL is always used, even if .env files are missing.
    ...(mode === 'production' && !process.env.VITE_API_URL
      ? { 'import.meta.env.VITE_API_URL': JSON.stringify('https://gradeai-iggp.onrender.com/api') }
      : {}),
  },
}))
