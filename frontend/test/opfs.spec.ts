import { afterEach, describe, expect, it, vi } from "vitest"
import { stageDownloadBytes } from "../utils/opfs.js"

describe("OPFS download staging", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("stages bytes in OPFS when available and does not use an encryption-key filename", async () => {
    const names: string[] = []
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
          }),
      },
    })

    const url = await stageDownloadBytes(new Uint8Array([1, 2, 3]), "plain.txt")
    expect(url.startsWith("blob:")).toBe(true)
    expect(names).toEqual(["plain.txt"])
    expect(names.join("")).not.toContain("#")
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
