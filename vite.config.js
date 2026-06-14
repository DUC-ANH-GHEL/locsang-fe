import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appBuildVersion = process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(appBuildVersion),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('browser-image-compression')) return 'vendor-image-tools';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('axios')) return 'vendor-http';
          return 'vendor';
        },
      },
    },
  },
  server: {
    open: true
  }
})
