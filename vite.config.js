import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",//fake browser
    globals: true,//usage of describe/it/expect without importing
    setupFiles: "./src/setupTests.js",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],   // text = table in your terminal, lcov = file for Codecov
      include: ["src/**/*.{js,jsx}"],
    },
  },
})