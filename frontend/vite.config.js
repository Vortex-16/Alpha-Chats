import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/Hooks'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable sourcemaps for better debugging
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          icons: ['react-icons'],
          syntax: ['react-syntax-highlighter'],
          socket: ['socket.io-client'],
          redux: ['@reduxjs/toolkit', 'react-redux']
        }
      }
    },
    // Increase chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
    // Better minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: false
      },
      mangle: {
        keep_fnames: true, // Keep function names for better error traces
        reserved: ['React', 'ReactDOM'] // Don't mangle React names
      }
    }
  },
  server: {
    port: 5173,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'production' 
          ? 'https://alpha-chats.vercel.app' 
          : 'http://localhost:4000',
        changeOrigin: true,
        secure: true
      }
    }
  },
  preview: {
    port: 4173,
    historyApiFallback: true
  }
})
