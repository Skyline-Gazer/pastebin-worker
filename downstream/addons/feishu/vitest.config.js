import { defineConfig } from "vitest/config"
import { cloudflareTest } from "@cloudflare/vitest-pool-workers"

export default defineConfig({
  plugins: [cloudflareTest({ miniflare: { compatibilityDate: "2026-07-01", d1Databases: ["DB"] } })],
  test: { include: ["downstream/addons/feishu/tests/**/*.spec.ts"] },
})
