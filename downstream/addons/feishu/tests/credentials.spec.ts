import { describe, expect, it } from "vitest"
import { Credentials } from "../worker/credentials"

describe("server-only credentials", () => {
  it("encrypts with fresh nonces and authenticates binding identity", async () => {
    const credentials = await Credentials.create("key-1", "11".repeat(32), "22".repeat(32))
    const password = credentials.generate()
    expect(password).toMatch(/^[a-f0-9]{64}$/)
    const first = await credentials.seal("binding-1", password)
    const second = await credentials.seal("binding-1", password)
    expect(first).not.toEqual(second)
    expect(first).not.toContain(password)
    expect(await credentials.open("binding-1", first)).toBe(password)
    await expect(credentials.open("binding-2", first)).rejects.toThrow()
  })

  it("fails closed on invalid keys and fingerprints with a separate key", async () => {
    await expect(Credentials.create("key-1", "", "22".repeat(32))).rejects.toThrow()
    const first = await Credentials.create("key-1", "11".repeat(32), "22".repeat(32))
    const second = await Credentials.create("key-1", "11".repeat(32), "33".repeat(32))
    expect(await first.fingerprint("body")).not.toBe(await second.fingerprint("body"))
  })
})
