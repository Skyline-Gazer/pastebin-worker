import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { generate } from "lean-qr"
import { toSvgDataURL } from "lean-qr/extras/svg"
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

function expectedQrSrc(url: string): string {
  return toSvgDataURL(generate(url), {
    pad: 2,
    on: "#000000",
    off: "#ffffff",
  })
}

async function renderedQrSrc(): Promise<string | null> {
  await userEvent.hover(screen.getByRole("button", { name: "QR code" }))
  const tooltip = await screen.findByRole("tooltip")
  return tooltip.querySelector("img")?.getAttribute("src") ?? null
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
  it("keeps Display URL primary for text-editor pastes and QR on Display", async () => {
    render(<UploadedPanel sourceKind="text" isLoading={false} pasteResponse={paste} />)
    expect(screen.getByRole("textbox", { name: "Display URL" })).toHaveValue("https://example.com/d/abcd")
    expect(screen.queryByRole("textbox", { name: "Download URL" })).not.toBeInTheDocument()
    expect(await renderedQrSrc()).toBe(expectedQrSrc("https://example.com/d/abcd"))
  })

  it("keeps text-editor pastes as TEXT even with a text-like filename and MIME", async () => {
    render(
      <UploadedPanel
        sourceKind="text"
        isLoading={false}
        pasteResponse={{ ...paste, filename: "notes.txt", mimeType: "text/plain" }}
      />,
    )
    expect(screen.queryByRole("textbox", { name: "Download URL" })).not.toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Display URL" })).toHaveValue("https://example.com/d/abcd")
    expect(await renderedQrSrc()).toBe(expectedQrSrc("https://example.com/d/abcd"))
  })

  it("uses Download ?a for File-tab .bin when response mimeType is absent (PiEB)", async () => {
    render(
      <UploadedPanel
        sourceKind="file"
        isLoading={false}
        pasteResponse={{ ...paste, filename: "ft-defect-01-smoke.bin" }}
      />,
    )
    expect(screen.getByRole("textbox", { name: "Download URL" })).toHaveValue("https://example.com/abcd?a")
    expect(screen.getByRole("textbox", { name: "Display URL" })).toHaveValue("https://example.com/d/abcd")
    expect(await renderedQrSrc()).toBe(expectedQrSrc("https://example.com/abcd?a"))
  })

  it("uses Download ?a for File-tab .png when response mimeType is absent", () => {
    render(<UploadedPanel sourceKind="file" isLoading={false} pasteResponse={{ ...paste, filename: "cat.png" }} />)
    expect(screen.getByRole("textbox", { name: "Download URL" })).toHaveValue("https://example.com/abcd?a")
  })

  it("uses Download ?a for File-tab .pdf when response mimeType is absent", () => {
    render(<UploadedPanel sourceKind="file" isLoading={false} pasteResponse={{ ...paste, filename: "doc.pdf" }} />)
    expect(screen.getByRole("textbox", { name: "Download URL" })).toHaveValue("https://example.com/abcd?a")
  })

  it("uses FILE Download ?a for File-tab notes.txt even when MIME is text/plain or omitted", async () => {
    render(
      <UploadedPanel
        sourceKind="file"
        isLoading={false}
        pasteResponse={{ ...paste, filename: "notes.txt", mimeType: "text/plain" }}
      />,
    )
    expect(screen.getByRole("textbox", { name: "Download URL" })).toHaveValue("https://example.com/abcd?a")
    expect(await renderedQrSrc()).toBe(expectedQrSrc("https://example.com/abcd?a"))
    cleanup()
    render(<UploadedPanel sourceKind="file" isLoading={false} pasteResponse={{ ...paste, filename: "notes.txt" }} />)
    expect(screen.getByRole("textbox", { name: "Download URL" })).toHaveValue("https://example.com/abcd?a")
  })

  it("uses FILE semantics for unknown extensions regardless of MIME metadata", () => {
    render(<UploadedPanel sourceKind="file" isLoading={false} pasteResponse={{ ...paste, filename: "blob.xyz" }} />)
    expect(screen.getByRole("textbox", { name: "Download URL" })).toHaveValue("https://example.com/abcd?a")
  })

  it("uses FILE semantics for multi-file ZIP results", () => {
    render(
      <UploadedPanel
        sourceKind="file"
        isLoading={false}
        pasteResponse={{ ...paste, filename: "upload.zip", mimeType: "application/zip" }}
      />,
    )
    expect(screen.getByRole("textbox", { name: "Download URL" })).toHaveValue("https://example.com/abcd?a")
  })

  it("uses FILE semantics for folder ZIP results even if mimeType is omitted", () => {
    render(<UploadedPanel sourceKind="file" isLoading={false} pasteResponse={{ ...paste, filename: "folder.zip" }} />)
    expect(screen.getByRole("textbox", { name: "Download URL" })).toHaveValue("https://example.com/abcd?a")
  })

  it("keeps encrypted file share on Display fragment and never puts the key in a query", async () => {
    render(
      <UploadedPanel
        sourceKind="file"
        isLoading={false}
        pasteResponse={{ ...paste, filename: "cat.png" }}
        encryptionKey="secret-key"
      />,
    )
    const display = screen.getByRole("textbox", { name: "Display URL" })
    expect(display).toHaveValue("https://example.com/d/abcd#secret-key")
    expect((display as HTMLInputElement).value).not.toMatch(/[?&]key=/)
    expect(screen.queryByRole("textbox", { name: "Download URL" })).not.toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Raw URL" })).toHaveValue("https://example.com/abcd")
    expect(await renderedQrSrc()).toBe(expectedQrSrc("https://example.com/d/abcd#secret-key"))
  })
})
