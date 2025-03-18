import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'sonner', 'framer-motion']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    emptyOutDir: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'sonner', 'framer-motion'],
    exclude: ['@supabase/supabase-js']
  }
});