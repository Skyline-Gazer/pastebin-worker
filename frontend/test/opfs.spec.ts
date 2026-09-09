import { afterEach, describe, expect, it, vi } from "vitest"
import { stageDownloadBytes } from "../utils/opfs.js"

describe("OPFS download staging", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("stages bytes in OPFS when available and does not use an encryption-key filename", async () => {
    const names: string[] = []
    const removed: string[] = []
    const file = new File([new Uint8Array([1, 2, 3])], "plain.txt")
    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: () =>
          Promise.resolve({
            getFileHandle: (name: string) => {
              names.push(name)
              return Promise.resolve({
                createWritable: () =>
                  Promise.resolve({
                    write: () => Promise.resolve(),
                    close: () => Promise.resolve(),
                  }),
                getFile: () => Promise.resolve(file),
              })
            },
            removeEntry: (name: string) => {
              removed.push(name)
              return Promise.resolve()
            },
          }),
      },
    })

    const url = await stageDownloadBytes(new Uint8Array([1, 2, 3]), "plain.txt")
    expect(url.startsWith("blob:")).toBe(true)
    expect(names).toEqual(["plain.txt"])
    expect(removed).toEqual(["plain.txt"])
    expect(names.join("")).not.toContain("#")
  })

  it("wipes then retries OPFS removal if the first removeEntry fails", async () => {
    const removed: string[] = []
    const writes: unknown[] = []
    const file = new File([new Uint8Array([1, 2, 3])], "plain.txt")
    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: () =>
          Promise.resolve({
            getFileHandle: () =>
              Promise.resolve({
                createWritable: () =>
                  Promise.resolve({
                    write: (data: unknown) => {
                      writes.push(data)
                      return Promise.resolve()
                    },
                    close: () => Promise.resolve(),
                  }),
                getFile: () => Promise.resolve(file),
              }),
            removeEntry: (name: string) => {
              removed.push(name)
              if (removed.length === 1) return Promise.reject(new Error("busy"))
              return Promise.resolve()
            },
          }),
      },
    })

    const url = await stageDownloadBytes(new Uint8Array([1, 2, 3]), "plain.txt")
    expect(url.startsWith("blob:")).toBe(true)
    expect(removed).toEqual(["plain.txt", "plain.txt"])
    expect(writes.some((data) => data instanceof Uint8Array && data.byteLength === 0)).toBe(true)
  })

  it("falls back to a Blob object URL when OPFS is unavailable", async () => {
    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: () => Promise.reject(new Error("denied")),
      },
    })

    const url = await stageDownloadBytes(new Uint8Array([9, 9]), "x.bin")
    expect(url.startsWith("blob:")).toBe(true)
  })
})
