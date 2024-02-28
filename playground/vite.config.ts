import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { vitePluginRadar } from 'vite-plugin-radar'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/sparrowql/',
  plugins: [react(), vitePluginRadar({
    enableDev: false,
    gtm: {
      id: 'G-ZDM0DBJJVX'
    }
  })],
})
