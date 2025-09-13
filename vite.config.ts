import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },

  // Handle markdown files
  assetsInclude: ['**/*.md'],

  server: {
    port: 3850,
    proxy: {
      '/api': {
        target: 'http://localhost:3851',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying for /api routes
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})