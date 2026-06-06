import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@eventiq/core': path.resolve(__dirname, '../packages/core/src/index.ts'),
      '@eventiq/react': path.resolve(__dirname, '../packages/react/src/index.ts'),
      '@eventiq/redux': path.resolve(__dirname, '../packages/redux/src/index.ts'),
      '@eventiq/react-query': path.resolve(__dirname, '../packages/react-query/src/index.ts'),
      '@tanstack/react-query': path.resolve(__dirname, 'node_modules/@tanstack/react-query'),
      '@reduxjs/toolkit': path.resolve(__dirname, 'node_modules/@reduxjs/toolkit'),
      'react-redux': path.resolve(__dirname, 'node_modules/react-redux'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
});
