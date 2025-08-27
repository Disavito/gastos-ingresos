<pre><code>import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic' // CRÍTICO: Hace explícito el JSX Runtime automático para Vite
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  preview: {
    host: true,
    allowedHosts: ['n8n-balance-general.mv7mvl.easypanel.host']
  }
})
</code></pre>
