import { defineConfig } from "vite"

export default defineConfig({
  build: {
    outDir: "dist/feishu",
    emptyOutDir: true,
    lib: { entry: "downstream/addons/feishu/worker/index.ts", formats: ["es"], fileName: "internal-services" },
    target: "es2022",
  },
})
