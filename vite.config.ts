import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  root: 'client',
  plugins: [basicSsl()],
  server: {
    port: 5173,
    proxy: { '/signal': { target: 'ws://127.0.0.1:8787', ws: true } }
  },
  build: { outDir: '../dist', emptyOutDir: true }
});
