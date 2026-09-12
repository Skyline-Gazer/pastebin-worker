import { createExecutionContext } from "cloudflare:test"
import { expect, test } from "vitest"
import { upload, workerFetch } from "./testUtils.js"

test("unrecognized non-UTF-8 body is stored as a file, not text/plain", async () => {
  const ctx = createExecutionContext()
  const binary = new Blob([new Uint8Array([0xff, 0xfe, 0xfd, 0xfc, 0x00, 0x11, 0x22, 0x33])])
  const uploaded = await upload(ctx, { c: binary })
  expect(uploaded.mimeType).toStrictEqual("application/octet-stream")

  const raw = await workerFetch(ctx, uploaded.url)
  expect(raw.headers.get("Content-Type")).toStrictEqual("application/octet-stream")

  const attachment = await workerFetch(ctx, `${uploaded.url}?a`)
  expect(attachment.headers.get("Content-Disposition")).toMatch(/^attachment;/)
  expect(attachment.headers.get("Content-Type")).toStrictEqual("application/octet-stream")
})
