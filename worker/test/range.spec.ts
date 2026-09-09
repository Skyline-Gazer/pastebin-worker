import { expect, test } from "vitest"
import { createExecutionContext, env } from "cloudflare:test"
import { genRandomBlob, upload, workerFetch } from "./testUtils.js"
import { parseSize } from "../../shared/parsers.js"
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
  expect(resp.headers.get("Content-Range")).toStrictEqual("bytes */4")
  expect(resp.headers.get("Access-Control-Expose-Headers")).toContain("Content-Range")
})

test("pasteAllowsByteRange is false for encryption or a future maxReads field", () => {
  const base: PasteMetadata = {
    schemaVersion: 2,
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

test("unencrypted R2 GET honors a simple byte Range without requiring the full object as text", async () => {
  const ctx = createExecutionContext()
  const blob = genRandomBlob(parseSize(env.R2_THRESHOLD)! * 2)
  const uploaded = await upload(ctx, { c: blob })
  const resp = await workerFetch(
    ctx,
    new Request(uploaded.url, {
      headers: { Range: "bytes=0-3" },
    }),
  )
  expect(resp.status).toStrictEqual(206)
  expect(resp.headers.get("Content-Range")).toStrictEqual(`bytes 0-3/${blob.size}`)
  expect(resp.headers.get("Content-Length")).toStrictEqual("4")
  expect(new Uint8Array(await resp.arrayBuffer())).toStrictEqual(new Uint8Array(await blob.slice(0, 4).arrayBuffer()))
})
