import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    outDir: 'dist'
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false
      },
      manifest: {
        name: 'Exercise Audio Couch',
        short_name: 'Exercise Audio Couch',
        description: 'Exercise Audio Couch',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png', // Replace with your icon path
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
