import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      manifest: {
        name: 'My Awesome App',
        short_name: 'Awesome App',
        description: 'My Awesome App description',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png', // Replace with your icon path
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
