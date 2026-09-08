import { env, createExecutionContext } from "cloudflare:test"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BASE_URL, workerFetch } from "./testUtils.js"

describe("uncaught errors", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns a stable generic 500 response while logging internal details", async () => {
    const internalMessage = "THIS_INTERNAL_ERROR_MUST_NOT_REACH_CLIENT"
    vi.spyOn(env.PB, "getWithMetadata").mockRejectedValueOnce(new Error(internalMessage))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)

    const response = await workerFetch(createExecutionContext(), `${BASE_URL}/uncaught-error-test`)
    const body = await response.text()

    expect(response.status).toStrictEqual(500)
    expect(body).toStrictEqual("Error 500: Internal Server Error\n")
    expect(body).not.toContain(internalMessage)
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(internalMessage))
  })
})
