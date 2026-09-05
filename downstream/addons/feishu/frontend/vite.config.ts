import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../dist/frontend",
    emptyOutDir: true,
    target: "es2022",
  },
})
