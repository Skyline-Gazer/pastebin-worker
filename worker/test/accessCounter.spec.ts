import { expect, it, vi } from "vitest"
import { genRandomBlob, upload, workerFetch } from "./testUtils.js"
import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test"
import type { PasteMetadata } from "../storage/storage.js"

it("does not rewrite paste content during access accounting", async () => {
  const ctx = createExecutionContext()
  const content = genRandomBlob(1024)
  const name = "abc"
  const url = (await upload(ctx, { c: content, n: name })).url

  async function getCounter() {
    const paste = await env.PB.getWithMetadata<PasteMetadata>("~" + name)
    return paste?.metadata?.accessCounter
  }

  const before = await env.PB.get("~" + name, "arrayBuffer")
  expect(await getCounter()).toStrictEqual(0)
  const put = vi.spyOn(env.PB, "put")

  await workerFetch(ctx, url)
  await waitOnExecutionContext(ctx)

  expect(put).not.toHaveBeenCalled()
  const afterFirstRead = await env.PB.get("~" + name, "arrayBuffer")
  expect(afterFirstRead).not.toBeNull()
  expect(new Uint8Array(afterFirstRead!)).toStrictEqual(new Uint8Array(before!))
  expect(await getCounter()).toStrictEqual(0)

  await workerFetch(ctx, url)
  await waitOnExecutionContext(ctx)

  expect(put).not.toHaveBeenCalled()
  const afterSecondRead = await env.PB.get("~" + name, "arrayBuffer")
  expect(afterSecondRead).not.toBeNull()
  expect(new Uint8Array(afterSecondRead!)).toStrictEqual(new Uint8Array(before!))
  expect(await getCounter()).toStrictEqual(0)
})
