import { render, screen, waitFor } from "@testing-library/react"
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

  it("opens a chooser for the managed task and leaves it unchanged on cancel", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch")
    render(<App />)
    const managedTask = screen.getByRole("checkbox", { name: "Complete managed entry" })
    expect(managedTask).not.toBeChecked()
    await user.click(managedTask)
    expect(managedTask).not.toBeChecked()
    expect(screen.getByRole("dialog", { name: "Choose completion action" })).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.getByRole("tab", { name: "进行中" })).toHaveAttribute("aria-selected", "true")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockRestore()
  })

  it("requires a distinct destructive confirmation before deleting", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch")
    render(<App />)
    await user.click(screen.getByRole("checkbox", { name: "Complete managed entry" }))
    await user.click(screen.getByRole("button", { name: "删除" }))
    expect(screen.getByRole("dialog", { name: "Confirm delete" })).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText("Active fixture")).toBeVisible()
    fetchMock.mockRestore()
  })

  it("uses session CSRF and authoritative result state without optimistic movement", async () => {
    const user = userEvent.setup()
    let complete: ((response: Response) => void) | undefined
    const completionResponse = new Promise<Response>((resolve) => {
      complete = resolve
    })
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockReturnValueOnce(completionResponse)
    render(<App />)
    await user.click(screen.getByRole("checkbox", { name: "Complete managed entry" }))
    await user.click(screen.getByRole("button", { name: "限期归档" }))
    const submit = screen.getByRole("button", { name: "Confirm archive" })
    await user.click(submit)
    expect(submit).toBeDisabled()
    expect(screen.getByText("Active fixture")).toBeVisible()
    complete!(
      new Response(
        JSON.stringify({
          entry: {
            id: "active-fixture",
            pasteName: "Authoritative archive",
            publicUrl: "https://example.invalid/p/authoritative",
            visibility: "archived",
            retentionMode: "timed",
            expiresAt: "2031-02-03T04:05:06.000Z",
            version: 4,
          },
        }),
      ),
    )
    await waitFor(() => expect(screen.queryByText("Active fixture")).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/session", { credentials: "include" })
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/entries/active-fixture/complete",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    )
    const completionRequest = fetchMock.mock.calls[1]?.[1] as unknown as RequestInit
    const headers = completionRequest.headers
    if (!headers || Array.isArray(headers) || headers instanceof Headers)
      throw new Error("expected object completion headers")
    expect(headers["X-CSRF-Token"]).toBe("csrf-test")
    expect(headers["Content-Type"]).toBe("application/json")
    expect(typeof headers["Idempotency-Key"]).toBe("string")
    if (typeof completionRequest.body !== "string") throw new Error("expected JSON completion body")
    expect(JSON.parse(completionRequest.body)).toEqual({
      action: "archive_expiring",
    })
    await user.click(screen.getByRole("tab", { name: "归档" }))
    expect(screen.getByText("Authoritative archive")).toBeVisible()
    expect(screen.getByText("限期归档：2031-02-03T04:05:06.000Z")).toBeVisible()
    fetchMock.mockRestore()
  })

  it("retains displayed state and shows only a sanitized error on completion failure", async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "UPSTREAM_UNCERTAIN", secret: "do-not-display" }), { status: 503 }),
      )
    render(<App />)
    await user.click(screen.getByRole("checkbox", { name: "Complete managed entry" }))
    await user.click(screen.getByRole("button", { name: "永久归档" }))
    await user.click(screen.getByRole("button", { name: "Confirm archive" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to complete entry. Please try again.")
    expect(screen.getByText("Active fixture")).toBeVisible()
    expect(screen.queryByText("do-not-display")).not.toBeInTheDocument()
    fetchMock.mockRestore()
  })

  it("reuses the completion identity when retrying a failed completion attempt", async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            entry: {
              id: "active-fixture",
              pasteName: "Authoritative archive",
              publicUrl: "https://example.invalid/p/authoritative",
              visibility: "archived",
              retentionMode: "permanent",
              expiresAt: null,
              version: 4,
            },
          }),
        ),
      )
    render(<App />)

    await user.click(screen.getByRole("checkbox", { name: "Complete managed entry" }))
    await user.click(screen.getByRole("button", { name: "Confirm archive" }))
    expect(await screen.findByRole("alert")).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Confirm archive" }))
    await waitFor(() => expect(screen.queryByText("Active fixture")).not.toBeInTheDocument())

    const firstRequest = fetchMock.mock.calls[1][1]
    const retryRequest = fetchMock.mock.calls[3][1]
    if (!firstRequest || !retryRequest) throw new Error("expected completion requests")
    const firstHeaders = firstRequest.headers as Record<string, string>
    const retryHeaders = retryRequest.headers as Record<string, string>
    expect(retryHeaders["Idempotency-Key"]).toBe(firstHeaders["Idempotency-Key"])
    fetchMock.mockRestore()
  })

  it("moves focus into the completion dialog and restores it when cancelled with Escape", async () => {
    const user = userEvent.setup()
    render(<App />)
    const managedTask = screen.getByRole("checkbox", { name: "Complete managed entry" })
    managedTask.focus()

    await user.click(managedTask)
    const dialog = screen.getByRole("dialog", { name: "Choose completion action" })
    expect(dialog).toContainElement(document.activeElement as HTMLElement | null)
    await user.keyboard("{Escape}")

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(managedTask).toHaveFocus()
  })

  it("keeps rendered Markdown tasks inert while the managed control is actionable", async () => {
    const user = userEvent.setup()
    render(<App />)
    const markdownTask = screen.getAllByRole("checkbox", { name: "Markdown task" })[0]
    await user.click(markdownTask)
    expect(markdownTask).not.toBeChecked()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
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
