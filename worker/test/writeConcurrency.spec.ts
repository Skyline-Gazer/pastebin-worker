import { createExecutionContext, env } from "cloudflare:test"
import { describe, expect, it } from "vitest"

import worker from "../index.js"
import type { PasteResponse } from "../../shared/interfaces.js"
import { createNamedPasteObject } from "../storage/storage.js"
import { BASE_URL, createFormData } from "./testUtils.js"

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

      const value: unknown = Reflect.get(target, property, target)
      if (typeof value === "function") {
        const method = value as (...args: unknown[]) => unknown
        return method.bind(target)
      }
      return value
    },
  })
}

describe("custom-name create concurrency", () => {
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
})
