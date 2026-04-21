import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const enableHttps = process.env.VITE_DEV_HTTPS === 'true';

export default defineConfig({
  plugins: [react()],
  base: '/natasha-nails-app/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: enableHttps
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  }
});
