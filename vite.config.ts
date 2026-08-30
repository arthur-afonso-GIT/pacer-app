import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: process.argv.some((argument) => argument.includes('storybook')),
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Pacer — Hábitos em grupo',
        short_name: 'Pacer',
        description: 'Desafios saudáveis, juntos.',
        theme_color: '#146c5a',
        background_color: '#f7f5ef',
        display: 'standalone',
        start_url: '/',
        lang: 'pt-BR',
        icons: [],
      },
    }),
  ],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/shared/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/**/*.stories.*'],
    },
  },
})
