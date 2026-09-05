import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { App } from "./App"
import { fixtureEntries, validateFixtureEntries } from "./fixtures"
import { RenderedMarkdown } from "./RenderedMarkdown"

describe("Feishu fixture rendering", () => {
  it("renders only typed local Active fixtures without a browser request", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
    render(<App />)
    expect(screen.getByRole("tab", { name: "进行中" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Active fixture")).toBeVisible()
    expect(screen.queryByText("Timed archive fixture")).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockRestore()
  })

  it("uses semantic tabs to filter the local Archive fixtures", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch")
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "归档" }))
    expect(screen.getByRole("tab", { name: "归档" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Permanent archive fixture")).toBeVisible()
    expect(screen.getByText("Timed archive fixture")).toBeVisible()
    expect(screen.queryByText("Active fixture")).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockRestore()
  })

  it("renders parser-recognized GFM tasks, including uppercase and nested tasks", () => {
    render(<App />)
    const taskCheckboxes = screen.getAllByRole("checkbox", { name: "Markdown task" })
    expect(taskCheckboxes).toHaveLength(3)
    expect(taskCheckboxes[0]).not.toBeChecked()
    expect(taskCheckboxes[1]).toBeChecked()
    expect(taskCheckboxes[2]).toBeChecked()
  })

  it("keeps task-looking fenced code literal and sanitizes unsafe markup", () => {
    render(<App />)
    expect(screen.getByText("- [ ] fenced source task")).toBeVisible()
    expect(screen.queryByText("Unsafe fixture markup")).not.toBeInTheDocument()
    expect(document.querySelector("script")).not.toBeInTheDocument()
    expect(document.querySelector("img[onerror]")).not.toBeInTheDocument()
    expect(document.querySelector('a[href^="javascript:"]')).not.toBeInTheDocument()
  })

  it("removes non-checkbox inputs from untrusted Markdown", () => {
    render(<RenderedMarkdown content={'<input type="text">'} />)
    expect(document.querySelector('input[type="text"]')).not.toBeInTheDocument()
  })

  it("shows static Archive retention labels from fixture expiresAt only", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "归档" }))
    expect(screen.getByText("永久归档")).toBeVisible()
    expect(screen.getByText("限期归档：2030-01-02T03:04:05.000Z")).toBeVisible()
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument()
  })

  it("keeps the managed task control inert and distinct from Markdown tasks", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch")
    render(<App />)
    const managedTask = screen.getByRole("checkbox", { name: "Managed entry task (Phase 5 no-op)" })
    expect(managedTask).not.toBeChecked()
    await user.click(managedTask)
    expect(managedTask).not.toBeChecked()
    expect(screen.getByRole("tab", { name: "进行中" })).toHaveAttribute("aria-selected", "true")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockRestore()
  })

  it("keeps fixtures public-safe and rejects malformed timed archive presentation data", () => {
    expect(Object.keys(fixtureEntries[0]).sort()).toEqual([
      "content",
      "expiresAt",
      "id",
      "managedTask",
      "pasteName",
      "publicUrl",
      "retentionMode",
      "visibility",
    ])
    expect(() =>
      validateFixtureEntries([
        {
          ...fixtureEntries[2],
          expiresAt: null,
        },
      ]),
    ).toThrow("Timed archive fixtures require a valid ISO expiresAt")
  })

  it("retains the compact tokenized shell and local theme-only state", async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole("main", { name: "Feishu Pastebin" })).toHaveClass("page-shell")
    expect(screen.getByRole("heading", { name: "Feishu Pastebin" })).toBeVisible()
    expect(screen.getByRole("tablist", { name: "Fixture views" })).toBeVisible()
    expect(document.documentElement).toHaveAttribute("data-theme", "light")
    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }))
    expect(document.documentElement).toHaveAttribute("data-theme", "dark")
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeVisible()
  })

  it("keeps the content-first shell free of client chrome markers", () => {
    render(<App />)
    expect(document.querySelector(".content-panel")).toBeInTheDocument()
    expect(document.querySelector(".shell-header")).toBeInTheDocument()
    expect(document.querySelector(".view-tabs")).toBeInTheDocument()
    expect(document.querySelector("[class*='sidebar'], [class*='avatar'], [class*='profile']")).not.toBeInTheDocument()
  })
})
