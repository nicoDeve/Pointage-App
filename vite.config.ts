import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['host.docker.internal'],
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tanstackStart(), nitro(), react(), tailwindcss()],
})
