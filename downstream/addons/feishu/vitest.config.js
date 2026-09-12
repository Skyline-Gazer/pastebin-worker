import { defineConfig } from "vitest/config"
import { cloudflareTest } from "@cloudflare/vitest-pool-workers"

const pastebinStub = `
export default {
  async fetch(request) {
    if (request.method !== "POST" || request.url !== "https://pb.223.im/") {
      return new Response("unhandled", { status: 500 })
    }
    const form = await request.formData()
    if (
      form.get("c") !== "body" ||
      form.get("e") !== "never" ||
      String(form.get("s") || "").length !== 64 ||
      form.get("p") !== "1"
    ) {
      return new Response("bad form", { status: 400 })
    }
    return Response.json({ url: "https://pb.223.im/abcd", expireAt: null, expirationSeconds: null })
  }
}
`

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: "2026-07-01",
        d1Databases: ["DB"],
        serviceBindings: { PASTEBIN_SERVICE: "pastebin-stub" },
        workers: [
          {
            name: "pastebin-stub",
            compatibilityDate: "2026-07-01",
            modules: true,
            script: pastebinStub,
          },
        ],
      },
    }),
  ],
  test: { include: ["downstream/addons/feishu/tests/**/*.spec.ts"] },
})
