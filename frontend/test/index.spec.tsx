import { describe, it, vi, expect, beforeAll, afterEach, afterAll } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { PasteBin } from "../pages/PasteBin.js"

export const mockedPasteUpload: PasteResponse = {
  url: "https://example.com/abcd",
  manageUrl: "https://example.com/abcd:aaaaaaaaaaaaaaaaaa",
  expireAt: "2025-05-01T00:00:00.000Z",
  expirationSeconds: 300,
  lastModifiedAt: "2025-04-30T23:55:00.000Z",
  createdAt: "2025-04-30T23:55:00.000Z",
  sizeBytes: 9,
  location: "KV",
}

export const mockedPasteContent = "something"

export const server = setupServer(
  http.post(`${__WRANGLER_CONFIG__.DEPLOY_URL}/`, () => {
    return HttpResponse.json(mockedPasteUpload)
  }),
  http.head(`${__WRANGLER_CONFIG__.DEPLOY_URL}/abcd`, () => {
    return new HttpResponse(null, {
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "Content-Length": String(new TextEncoder().encode(mockedPasteContent).length),
      },
    })
  }),
  http.get(`${__WRANGLER_CONFIG__.DEPLOY_URL}/abcd`, () => {
    return HttpResponse.text(mockedPasteContent)
  }),
)

beforeAll(() => {
  stubBrowerFunctions()
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
  cleanup()
  localStorage.clear()
})

afterAll(() => {
  unStubBrowerFunctions()
  server.close()
})

import "@testing-library/jest-dom/vitest"
import { userEvent } from "@testing-library/user-event"
import type { PasteResponse } from "../../shared/interfaces.js"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { stubBrowerFunctions, unStubBrowerFunctions } from "./testUtils.js"

describe("Pastebin", () => {
  it("can upload", async () => {
    render(<PasteBin config={__WRANGLER_CONFIG__} />)

    const title = screen.getByText("Pastebin Worker")
    expect(title).toBeInTheDocument()

    const editor = screen.getByRole("textbox", { name: "Paste editor" })
    expect(editor).toBeInTheDocument()

    const filename = screen.getByRole("textbox", { name: "File name" })
    expect(filename).toHaveValue("Untitled")

    const submitter = screen.getByRole("button", { name: "Upload" })
    expect(submitter).toBeInTheDocument()
    expect(submitter).not.toBeEnabled()

    await userEvent.type(editor, "something")

    expect(submitter).toBeEnabled()
    await userEvent.click(submitter)

    await new Promise((resolve) => setTimeout(resolve, 1000))
    const urlShow = screen.getByRole("textbox", { name: "Raw URL" })
    expect((urlShow as HTMLInputElement).value).toStrictEqual(mockedPasteUpload.url)

    const manageUrlShow = screen.getByRole("textbox", { name: "Manage URL" })
    expect((manageUrlShow as HTMLInputElement).value).toStrictEqual(mockedPasteUpload.manageUrl)

    expect(screen.getByRole("heading", { name: "Recent uploads" })).toBeInTheDocument()
    expect(screen.getByText(/stored on this device/i)).toBeInTheDocument()
    const recent = screen.getByRole("button", { name: "abcd" })
    expect(recent).toBeInTheDocument()
    expect(recent).not.toHaveTextContent("aaaaaaaaaaaaaaaaaa")
  })

  it("restores a recent upload into the Manage URL field", async () => {
    render(<PasteBin config={__WRANGLER_CONFIG__} />)
    const editor = screen.getByRole("textbox", { name: "Paste editor" })
    await userEvent.type(editor, "something")
    await userEvent.click(screen.getByRole("button", { name: "Upload" }))
    await screen.findByRole("textbox", { name: "Raw URL" })

    cleanup()
    render(<PasteBin config={__WRANGLER_CONFIG__} />)
    await userEvent.click(screen.getByRole("button", { name: "abcd" }))
    const manageUrl = screen.getByPlaceholderText("Manage URL")
    expect((manageUrl as HTMLInputElement).value).toStrictEqual(mockedPasteUpload.manageUrl)
  })

  it("renders a permanent upload expiration as Never", async () => {
    const originalExpireAt = mockedPasteUpload.expireAt
    const originalSeconds = mockedPasteUpload.expirationSeconds
    mockedPasteUpload.expireAt = null
    mockedPasteUpload.expirationSeconds = null
    try {
      render(<PasteBin config={__WRANGLER_CONFIG__} />)
      await userEvent.type(screen.getByRole("textbox", { name: "Paste editor" }), "permanent")
      await userEvent.click(screen.getByRole("button", { name: "Upload" }))
      await screen.findByRole("textbox", { name: "Raw URL" })
      const expirations = screen.getAllByRole("textbox", { name: "Expiration" })
      const expiration = expirations[expirations.length - 1]
      expect((expiration as HTMLInputElement).value).toStrictEqual("Never")
    } finally {
      mockedPasteUpload.expireAt = originalExpireAt
      mockedPasteUpload.expirationSeconds = originalSeconds
    }
  })

  it("shows a QR tooltip on the Display URL after upload", async () => {
    render(<PasteBin config={__WRANGLER_CONFIG__} />)

    const editor = screen.getByRole("textbox", { name: "Paste editor" })
    await userEvent.type(editor, "something")
    await userEvent.click(screen.getByRole("button", { name: "Upload" }))
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const displayUrl = screen.getByRole("textbox", { name: "Display URL" })
    expect(displayUrl).toHaveValue("https://example.com/d/abcd")

    const qrButton = screen.getByRole("button", { name: "QR code" })
    expect(qrButton).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "QR code" })).toHaveLength(1)

    await userEvent.hover(qrButton)
    const tooltip = await screen.findByRole("tooltip")
    const qrImage = tooltip.querySelector("img")
    expect(qrImage).not.toBeNull()
    expect(qrImage?.getAttribute("src")).toMatch(/^data:image\/svg/)

    expect(screen.getByRole("textbox", { name: "Manage URL" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Raw URL" })).toBeInTheDocument()
  })

  it("still shows Display URL when the paste URL is too long for a QR", async () => {
    const longName = `~${"a".repeat(8000)}`
    server.use(
      http.post(`${__WRANGLER_CONFIG__.DEPLOY_URL}/`, () => {
        return HttpResponse.json({
          ...mockedPasteUpload,
          url: `https://example.com/${longName}`,
          manageUrl: `https://example.com/${longName}:aaaaaaaaaaaaaaaaaa`,
        })
      }),
    )

    render(<PasteBin config={__WRANGLER_CONFIG__} />)
    const editor = screen.getByRole("textbox", { name: "Paste editor" })
    await userEvent.type(editor, "something")
    await userEvent.click(screen.getByRole("button", { name: "Upload" }))
    await new Promise((resolve) => setTimeout(resolve, 1000))

    expect(screen.getByRole("textbox", { name: "Display URL" })).toHaveValue(`https://example.com/d/${longName}`)
    expect(screen.getByRole("textbox", { name: "Raw URL" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "QR code" })).not.toBeInTheDocument()
  })

  it("refuse illegal settings", async () => {
    render(<PasteBin config={__WRANGLER_CONFIG__} />)
    // due to bugs https://github.com/adobe/react-spectrum/discussions/8037, we need to use duplicated name here
    const expire = screen.getByRole("textbox", { name: "Expiration" })
    expect(expire).toBeValid()
    await userEvent.type(expire, "xxx")
    expect(expire).toBeInvalid()
  })
})

describe("Pastebin admin page", () => {
  it("renders admin page", async () => {
    vi.stubGlobal("location", new URL("https://example.com/abcd:xxxxxxxxx"))
    render(<PasteBin config={__WRANGLER_CONFIG__} />)

    const editor = screen.getByRole("textbox", { name: "Paste editor" })
    await userEvent.click(editor) // meaningless click, just ensure useEffect is done
    expect(editor).toBeInTheDocument()
    expect((editor as HTMLTextAreaElement).value).toStrictEqual(mockedPasteContent)
  })
})
