import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'KCET College Predictor',
        short_name: 'KCET Predictor',
        description: 'Find your engineering college based on your KCET rank.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'https://placehold.co/192x192/png?text=KCET',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://placehold.co/512x512/png?text=KCET',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
