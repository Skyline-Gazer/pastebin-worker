import { createExecutionContext, env } from "cloudflare:test"
import { afterEach, describe, expect, it, vi } from "vitest"

import worker from "../index.js"
import type { PasteResponse } from "../../shared/interfaces.js"
import { createNamedPasteObject } from "../storage/storage.js"
import { BASE_URL, createFormData } from "./testUtils.js"

function boundMember<T extends object>(target: T, property: string | symbol): unknown {
  const value: unknown = Reflect.get(target, property, target)
  if (typeof value === "function") {
    const method = value as (...args: unknown[]) => unknown
    return method.bind(target)
  }
  return value
}

function synchronizeAvailabilityReads(namespace: KVNamespace, pasteName: string): KVNamespace {
  const getWithMetadata = namespace.getWithMetadata.bind(namespace) as (...args: unknown[]) => Promise<unknown>
  let matchingReads = 0
  let releaseReads!: () => void
  const bothReadsStarted = new Promise<void>((resolve) => {
    releaseReads = resolve
  })

  return new Proxy(namespace, {
    get(target, property) {
      if (property === "getWithMetadata") {
        return async (...args: unknown[]) => {
          const result = await getWithMetadata(...args)
          if (args[0] === pasteName && matchingReads < 2) {
            matchingReads += 1
            if (matchingReads === 2) releaseReads()
            await bothReadsStarted
          }
          return result
        }
      }
      return boundMember(target, property)
    },
  })
}

function synchronizeR2Heads(bucket: R2Bucket, pasteName: string): R2Bucket {
  const head = bucket.head.bind(bucket)
  let matchingReads = 0
  let releaseReads!: () => void
  const bothReadsStarted = new Promise<void>((resolve) => {
    releaseReads = resolve
  })

  return new Proxy(bucket, {
    get(target, property) {
      if (property === "head") {
        return async (key: string) => {
          const result = await head(key)
          if (key === pasteName && matchingReads < 2) {
            matchingReads += 1
            if (matchingReads === 2) releaseReads()
            await bothReadsStarted
          }
          return result
        }
      }
      return boundMember(target, property)
    },
  })
}

function failKvPuts(namespace: KVNamespace, pasteName: string): KVNamespace {
  const put = namespace.put.bind(namespace) as (key: string, ...args: unknown[]) => Promise<unknown>
  return new Proxy(namespace, {
    get(target, property) {
      if (property === "put") {
        return async (key: string, ...args: unknown[]) => {
          if (key === pasteName) {
            throw new Error("kv unavailable")
          }
          return put(key, ...args)
        }
      }
      return boundMember(target, property)
    },
  })
}

function r2PutThrowsOnUploadedBefore(bucket: R2Bucket): R2Bucket {
  const put = bucket.put.bind(bucket)
  return new Proxy(bucket, {
    get(target, property) {
      if (property === "put") {
        return async (...args: Parameters<R2Bucket["put"]>) => {
          const options = args[2]
          if (
            options?.onlyIf !== undefined &&
            typeof options.onlyIf === "object" &&
            "uploadedBefore" in options.onlyIf
          ) {
            throw new Error("cleanup put failed")
          }
          return put(...args)
        }
      }
      return boundMember(target, property)
    },
  })
}

function failKvPutsAfterReplacingR2(
  namespace: KVNamespace,
  bucket: R2Bucket,
  pasteName: string,
  newerBody: string,
): KVNamespace {
  const put = namespace.put.bind(namespace) as (key: string, ...args: unknown[]) => Promise<unknown>
  return new Proxy(namespace, {
    get(target, property) {
      if (property === "put") {
        return async (key: string, ...args: unknown[]) => {
          if (key === pasteName) {
            await bucket.put(pasteName, newerBody, {
              customMetadata: { willExpireAtUnix: String(Math.floor(Date.now() / 1000) + 3600) },
            })
            throw new Error("kv unavailable")
          }
          return put(key, ...args)
        }
      }
      return boundMember(target, property)
    },
  })
}

describe("custom-name create concurrency", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns one winner and one stable 409 when availability checks race", async () => {
    const requestedName = "atomic-race"
    const pasteName = `~${requestedName}`
    const racingEnv = {
      ...env,
      PB: synchronizeAvailabilityReads(env.PB, pasteName),
    }
    const attempts = await Promise.all(
      ["first contender", "second contender"].map(async (content) => ({
        content,
        response: await worker.fetch(
          new Request(BASE_URL, {
            method: "POST",
            body: createFormData({ c: new Blob([content]), n: requestedName }),
          }),
          racingEnv,
          createExecutionContext(),
        ),
      })),
    )

    expect(attempts.map(({ response }) => response.status).sort()).toStrictEqual([200, 409])

    const winner = attempts.find(({ response }) => response.status === 200)!
    const loser = attempts.find(({ response }) => response.status === 409)!
    const created = await winner.response.json<PasteResponse>()

    expect(created.location).toStrictEqual("R2")
    expect(await loser.response.text()).toStrictEqual(`Error 409: name '${pasteName}' is already used\n`)

    const stored = await worker.fetch(new Request(created.url), racingEnv, createExecutionContext())
    expect(stored.status).toStrictEqual(200)
    expect(await stored.text()).toStrictEqual(winner.content)
  })

  it("allows only one contender to replace an expired R2 name claim", async () => {
    const pasteName = "~expired-atomic-race"
    await env.R2.put(pasteName, "expired", {
      customMetadata: { willExpireAtUnix: "10" },
    })

    const contents = [
      new TextEncoder().encode("first replacement").buffer,
      new TextEncoder().encode("second replacement").buffer,
    ]
    const results = await Promise.all(
      contents.map((content) => createNamedPasteObject(env, pasteName, content, 100, 20)),
    )

    expect(results.filter((result) => result !== null)).toHaveLength(1)
    const winnerIndex = results.findIndex((result) => result !== null)
    expect(await (await env.R2.get(pasteName))!.text()).toStrictEqual(new TextDecoder().decode(contents[winnerIndex]))
  })

  it("allows only one contender to reclaim an expired name with an identical body", async () => {
    const pasteName = "~expired-identical-body"
    const replacement = new TextEncoder().encode("same replacement").buffer
    await env.R2.put(pasteName, "same replacement", {
      customMetadata: { willExpireAtUnix: "10" },
    })

    const racingEnv = {
      ...env,
      R2: synchronizeR2Heads(env.R2, pasteName),
    }
    const results = await Promise.all([
      createNamedPasteObject(racingEnv, pasteName, replacement, 100, 20),
      createNamedPasteObject(racingEnv, pasteName, replacement, 100, 20),
    ])

    expect(results.filter((result) => result !== null)).toHaveLength(1)
    expect(await (await env.R2.get(pasteName))!.text()).toStrictEqual("same replacement")
  })

  it("reclaims an expired legacy R2 name that has no custom expiration metadata", async () => {
    const pasteName = "~expired-legacy-r2"
    await env.R2.put(pasteName, "legacy expired")

    const created = await createNamedPasteObject(
      env,
      pasteName,
      new TextEncoder().encode("legacy replacement").buffer,
      100,
      20,
    )

    expect(created).not.toBeNull()
    expect(await (await env.R2.get(pasteName))!.text()).toStrictEqual("legacy replacement")
  })

  it("releases a new R2 name claim when KV metadata persistence fails", async () => {
    const requestedName = "kv-fail-atomic"
    const pasteName = `~${requestedName}`
    const failingEnv = {
      ...env,
      PB: failKvPuts(env.PB, pasteName),
    }

    const failed = await worker.fetch(
      new Request(BASE_URL, {
        method: "POST",
        body: createFormData({ c: new Blob(["stranded"]), n: requestedName }),
      }),
      failingEnv,
      createExecutionContext(),
    )
    expect(failed.status).toStrictEqual(500)

    const retry = await worker.fetch(
      new Request(BASE_URL, {
        method: "POST",
        body: createFormData({ c: new Blob(["retry"]), n: requestedName }),
      }),
      env,
      createExecutionContext(),
    )
    expect(retry.status).toStrictEqual(200)
    const created = await retry.json<PasteResponse>()
    expect(created.location).toStrictEqual("R2")
    expect(await (await worker.fetch(new Request(created.url), env, createExecutionContext())).text()).toStrictEqual(
      "retry",
    )
  })

  it("does not delete a newer R2 generation if metadata persistence fails late", async () => {
    const requestedName = "kv-fail-newer-gen"
    const pasteName = `~${requestedName}`
    const failingEnv = {
      ...env,
      PB: failKvPutsAfterReplacingR2(env.PB, env.R2, pasteName, "newer generation"),
    }

    const failed = await worker.fetch(
      new Request(BASE_URL, {
        method: "POST",
        body: createFormData({ c: new Blob(["original claim"]), n: requestedName }),
      }),
      failingEnv,
      createExecutionContext(),
    )
    expect(failed.status).toStrictEqual(500)
    expect(await (await env.R2.get(pasteName))!.text()).toStrictEqual("newer generation")
  })

  it("preserves the original metadata error if claim cleanup throws", async () => {
    const requestedName = "kv-fail-cleanup-throw"
    const pasteName = `~${requestedName}`
    const failingEnv = {
      ...env,
      PB: failKvPuts(env.PB, pasteName),
      R2: r2PutThrowsOnUploadedBefore(env.R2),
    }

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const failed = await worker.fetch(
      new Request(BASE_URL, {
        method: "POST",
        body: createFormData({ c: new Blob(["cleanup throw"]), n: requestedName }),
      }),
      failingEnv,
      createExecutionContext(),
    )
    const body = await failed.text()
    expect(failed.status).toStrictEqual(500)
    expect(body).toStrictEqual("Error 500: Internal Server Error\n")
    expect(body).not.toContain("cleanup put failed")
    expect(body).not.toContain("kv unavailable")
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("kv unavailable"))
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("cleanup put failed"))
  })
})
