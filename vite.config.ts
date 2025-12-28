
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
          'charts': ['recharts'],
          'scanner': ['html5-qrcode']
        }
      },
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    port: 3000,
  },
});
