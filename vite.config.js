import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  // Configuración del servidor de desarrollo
  server: {
    open: "/index.html",
  },
  
  // Directorio de construcción
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  
  // Opciones para optimización
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  plugins: [
    tailwindcss(),
  ],
  
})

