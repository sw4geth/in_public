import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: '/in_public/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: [
      'react-pdf',
      '@zoralabs/protocol-sdk',
      'wagmi',
      '@rainbow-me/rainbowkit'
    ],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-pdf': ['react-pdf'],
          wagmi: ['wagmi'],
          rainbowkit: ['@rainbow-me/rainbowkit'],
          zora: ['@zoralabs/protocol-sdk'],
        },
      },
    },
  },
  define: {
    'process.env': {},
    global: 'window',
  },
  publicDir: 'src',
});
