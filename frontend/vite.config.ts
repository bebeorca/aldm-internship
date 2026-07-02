import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
    alias: [{ find: /^mammoth$/, replacement: 'mammoth/mammoth.browser.js' }],
  },
  server: {
  host: true,
  proxy: {
  '/api': {
    target: 'http://backend:8000',
    changeOrigin: true,
  },
  '/storage': {
    target: 'http://backend:8000',   // ← untuk fetch file .docx dari browser
    changeOrigin: true,
  },
},
  },
});