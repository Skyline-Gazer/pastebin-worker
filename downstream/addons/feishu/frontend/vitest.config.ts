import { defineConfig } from "vitest/config"

export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  test: {
    environment: "jsdom",
    include: ["App.spec.tsx"],
    setupFiles: ["./test/setup.ts"],
  },
})
