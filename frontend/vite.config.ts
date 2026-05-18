import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Bind to all interfaces so the dev server is reachable from other
    // devices on the same LAN. Vite logs the LAN URL on startup.
    host: true,
    port: 3000,
    strictPort: true,
    open: false,
  },
})
