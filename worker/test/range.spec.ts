import { expect, test } from "vitest"
import { createExecutionContext } from "cloudflare:test"
import { upload, workerFetch } from "./testUtils.js"
import { pasteAllowsByteRange } from "../byteRange.js"
import type { PasteMetadata } from "../storage/storage.js"

test("unencrypted GET honors a simple byte Range", async () => {
  const ctx = createExecutionContext()
  const body = "abcdefghij"
  const uploaded = await upload(ctx, { c: body })
  const resp = await workerFetch(
    ctx,
    new Request(uploaded.url, {
      headers: { Range: "bytes=0-3" },
    }),
  )
  expect(resp.status).toStrictEqual(206)
  expect(resp.headers.get("Content-Range")).toStrictEqual("bytes 0-3/10")
  expect(resp.headers.get("Content-Length")).toStrictEqual("4")
  expect(await resp.text()).toStrictEqual("abcd")
})

test("encrypted GET ignores Range so future consume-on-GET stays whole-body", async () => {
  const ctx = createExecutionContext()
  const uploaded = await upload(ctx, {
    c: "cipher-body",
    "encryption-scheme": "AES-GCM",
  })
  const resp = await workerFetch(
    ctx,
    new Request(uploaded.url, {
      headers: { Range: "bytes=0-3" },
    }),
  )
  expect(resp.status).toStrictEqual(200)
  expect(new TextDecoder().decode(await resp.arrayBuffer())).toStrictEqual("cipher-body")
  expect(resp.headers.get("Content-Range")).toBeNull()
})

test("unsatisfiable Range returns 416", async () => {
  const ctx = createExecutionContext()
  const uploaded = await upload(ctx, { c: "abcd" })
  const resp = await workerFetch(
    ctx,
    new Request(uploaded.url, {
      headers: { Range: "bytes=90-99" },
    }),
  )
  expect(resp.status).toStrictEqual(416)
})

test("pasteAllowsByteRange is false for encryption or a future maxReads field", () => {
  const base: PasteMetadata = {
    schemaVersion: 1,
    location: "KV",
    passwd: "x",
    lastModifiedAtUnix: 1,
    createdAtUnix: 1,
    willExpireAtUnix: 9,
    accessCounter: 0,
    sizeBytes: 4,
  }
  expect(pasteAllowsByteRange(base)).toBe(true)
  expect(pasteAllowsByteRange({ ...base, encryptionScheme: "AES-GCM" })).toBe(false)
  expect(pasteAllowsByteRange({ ...base, maxReads: 1 })).toBe(false)
})
