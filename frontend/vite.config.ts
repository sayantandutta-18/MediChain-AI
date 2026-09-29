import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    // On Windows `localhost` resolves to ::1 (IPv6) before 127.0.0.1, while a
    // default listener is IPv4-only - which makes http://localhost:5173 fail in
    // the browser even though the server is running. `host: true` listens on
    // every interface so localhost, 127.0.0.1 and the LAN address all work.
    host: command === 'serve' ? true : '127.0.0.1',
    port: 5173,
    strictPort: false,
    proxy: {
      // Keeps the browser on one origin in development.
      // `changeOrigin: false` preserves the original Host header so the API's
      // same-origin check behaves exactly as it does behind nginx in production.
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:4000',
        changeOrigin: false,
      },
    },
  },
  // `vite preview` mirrors the dev proxy so the production build can be
  // exercised against a real API on the same origin.
  preview: {
    host: command === 'serve' ? true : '127.0.0.1',
    port: 4173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:4000',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // The three.js layer is a single large chunk by nature; it is lazily
    // imported and only fetched on the landing page.
    chunkSizeWarningLimit: 1200,
    // TRD-14: keep the 3D layer from bloating the initial bundle.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          motion: ['framer-motion'],
        },
      },
    },
  },
}));
