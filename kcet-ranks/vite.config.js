import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      workbox: {
        navigateFallbackDenylist: [/^\/sitemap.*\.xml$/, /^\/robots\.txt$/],
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js', 'assets/AdminApp-*.js', 'assets/GearAdmin-*.js', 'assets/supabase-*.js', 'data_*.json', 'data_*.json.*', 'meta_*.json', 'streams.json', 'college_data/**/*']
      },
      manifest: {
        name: 'KCET College Predictor',
        short_name: 'KCET Predictor',
        description: 'Find your engineering college based on your KCET rank.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  define: {
    __BUILD_HASH__: JSON.stringify(Date.now().toString())
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react']
        }
      }
    }
  }
})
