import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/vocabulary-study/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: function(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
        },
      },
    },
  },
});
