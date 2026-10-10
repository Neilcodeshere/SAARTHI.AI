import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { saarthiAiApi } from './server/api.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // GROQ_* is loaded for the server middleware only. Vite exposes just VITE_* to the client,
  // so the key never reaches the bundle; refuse a VITE_-prefixed key outright.
  const fileEnv = loadEnv(mode, process.cwd(), ['GROQ_', 'VITE_GROQ'])
  if (Object.keys({ ...fileEnv, ...process.env }).some(k => k.startsWith('VITE_GROQ'))) {
    throw new Error('Do not define VITE_GROQ_* variables: they would be exposed to the browser. Use GROQ_API_KEY instead.')
  }
  const serverEnv = { ...fileEnv, ...process.env }

  return {
    plugins: [
      react(),
      tailwindcss(),
      saarthiAiApi(serverEnv),
    ],
  }
})
