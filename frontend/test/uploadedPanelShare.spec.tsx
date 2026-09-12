import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { UploadedPanel } from "../components/UploadedPanel.js"
import type { PasteResponse } from "../../shared/interfaces.js"
import { stubBrowerFunctions, unStubBrowerFunctions } from "./testUtils.js"
import "@testing-library/jest-dom/vitest"

const paste: PasteResponse = {
  url: "https://example.com/abcd",
  manageUrl: "https://example.com/abcd:aaaaaaaaaaaaaaaaaa",
  expireAt: "2025-05-01T00:00:00.000Z",
  expirationSeconds: 300,
  lastModifiedAt: "2025-04-30T23:55:00.000Z",
  createdAt: "2025-04-30T23:55:00.000Z",
  sizeBytes: 9,
  location: "KV",
}

beforeAll(() => {
  stubBrowerFunctions()
})

afterEach(() => {
  cleanup()
})

afterAll(() => {
  unStubBrowerFunctions()
})

describe("UploadedPanel share URLs", () => {
  it("keeps Display URL primary for text pastes and QR on Display", () => {
    render(<UploadedPanel isLoading={false} pasteResponse={paste} />)
    expect(screen.getByRole("textbox", { name: "Display URL" })).toHaveValue("https://example.com/d/abcd")
    expect(screen.getByRole("button", { name: "QR code" })).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Download URL" })).not.toBeInTheDocument()
  })

  it("makes unencrypted file download URL primary with ?a and QR on that URL", async () => {
    render(<UploadedPanel isLoading={false} pasteResponse={{ ...paste, mimeType: "image/png", filename: "cat.png" }} />)
    const download = screen.getByRole("textbox", { name: "Download URL" })
    expect(download).toHaveValue("https://example.com/abcd?a")
    expect(screen.getByRole("textbox", { name: "Display URL" })).toHaveValue("https://example.com/d/abcd")
    expect(screen.getAllByRole("button", { name: "QR code" })).toHaveLength(1)
    await userEvent.hover(screen.getByRole("button", { name: "QR code" }))
    const tooltip = await screen.findByRole("tooltip")
    expect(tooltip.querySelector("img")).not.toBeNull()
  })

  it("keeps encrypted file share on Display fragment and never puts the key in a query", () => {
    render(
      <UploadedPanel
        isLoading={false}
        pasteResponse={{ ...paste, mimeType: "image/png", filename: "cat.png" }}
        encryptionKey="secret-key"
      />,
    )
    const display = screen.getByRole("textbox", { name: "Display URL" })
    expect(display).toHaveValue("https://example.com/d/abcd#secret-key")
    expect((display as HTMLInputElement).value).not.toMatch(/[?&]key=/)
    expect(screen.queryByRole("textbox", { name: "Download URL" })).not.toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Raw URL" })).toHaveValue("https://example.com/abcd")
  })
})
