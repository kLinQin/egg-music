import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/lrclib': {
        target: 'https://lrclib.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/lrclib/, '/api'),
      },
      '/api/lyricsovh': {
        target: 'https://api.lyrics.ovh',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/lyricsovh/, ''),
      },
      '/api/gtranslate': {
        target: 'https://translate.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/gtranslate/, ''),
      },
    },
  },
})