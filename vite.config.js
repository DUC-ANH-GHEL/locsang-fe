import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appBuildVersion = process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(appBuildVersion),
  },
  server: {
    open: true
  }
})
