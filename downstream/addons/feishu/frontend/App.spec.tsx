import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { App, deriveVisibleEligibleActiveIds, pruneSelectedIds } from "./App"
import { fixtureEntries, validateFixtureEntries } from "./fixtures"
import { RenderedMarkdown } from "./RenderedMarkdown"

describe("Feishu fixture rendering", () => {
  it("shows a compact three-action bar with the exact selected count only for a nonempty Batch selection", async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))
    expect(screen.queryByRole("toolbar", { name: "Batch actions" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" }))

    const actionBar = screen.getByRole("toolbar", { name: "Batch actions" })
    expect(actionBar).toHaveTextContent("已选择 1 项")
    expect(within(actionBar).getAllByRole("button")).toHaveLength(3)
    expect(within(actionBar).getByRole("button", { name: "永久归档" })).toBeEnabled()
    expect(within(actionBar).getByRole("button", { name: "限期归档" })).toBeEnabled()
    expect(within(actionBar).getByRole("button", { name: "删除" })).toBeEnabled()

    await user.click(screen.getByRole("button", { name: "清空" }))
    expect(screen.queryByRole("toolbar", { name: "Batch actions" })).not.toBeInTheDocument()
  })

  it("confirms one protected batch request from the intent and disables duplicate actions in flight", async () => {
    const user = userEvent.setup()
    let finish: ((response: Response) => void) | undefined
    const pendingBatch = new Promise<Response>((resolve) => {
      finish = resolve
    })
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockReturnValueOnce(pendingBatch)
    render(<App />)

    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))
    await user.click(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" }))
    const expiring = screen.getByRole("button", { name: "限期归档" })
    expiring.focus()
    await user.click(expiring)

    const dialog = screen.getByRole("dialog", { name: "Confirm expiring archive" })
    expect(dialog).toHaveTextContent("1 项")
    expect(dialog).toContainElement(document.activeElement as HTMLElement | null)
    await user.keyboard("{Tab}")
    expect(dialog).toContainElement(document.activeElement as HTMLElement | null)
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(expiring).toHaveFocus()
    expect(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })).toBeChecked()
    expect(fetchMock).not.toHaveBeenCalled()

    await user.click(expiring)
    await user.click(screen.getByRole("button", { name: "Confirm batch action" }))
    expect(screen.getByRole("button", { name: "永久归档" })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]).toMatchObject([
      "/api/batch",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": "csrf-test",
        },
        body: JSON.stringify({ action: "archive_expiring", ids: ["active-fixture"] }),
      },
    ])
    const firstKey = (fetchMock.mock.calls[1][1]?.headers as Record<string, string>)["Idempotency-Key"]
    expect(firstKey).toEqual(expect.any(String))
    await user.click(screen.getByRole("button", { name: "限期归档" }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    finish!(
      new Response(
        JSON.stringify({
          requested: 1,
          succeeded: 0,
          failed: 1,
          results: [{ id: "active-fixture", status: "failed", code: "UNAVAILABLE", retryable: true }],
        }),
      ),
    )
    expect(await screen.findByRole("status")).toHaveTextContent("已处理 0 项，1 项失败")
    expect(screen.getByText("Active fixture")).toBeVisible()
    expect(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })).toBeChecked()
    fetchMock.mockRestore()
  })

  it("applies only matching successful rows and retries retained failures with a fresh key", async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            requested: 2,
            succeeded: 1,
            failed: 1,
            results: [
              {
                id: "active-fixture",
                status: "ok",
                state: { visibility: "archived", retentionMode: "timed", expiresAt: "2031-01-02T03:04:05.000Z" },
              },
              { id: "safe-entry-id", status: "failed", code: "UNAVAILABLE", retryable: true },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            requested: 1,
            succeeded: 1,
            failed: 0,
            results: [{ id: "safe-entry-id", status: "ok", deleted: true }],
          }),
        ),
      )
    const entry = { ...fixtureEntries[0], id: "safe-entry-id", pasteName: "Safe fixture" }
    render(<App initialEntries={[fixtureEntries[0], entry]} />)

    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))
    await user.click(screen.getByRole("button", { name: "全选" }))
    await user.click(screen.getByRole("button", { name: "删除" }))
    const dialog = screen.getByRole("dialog", { name: "Confirm batch delete" })
    expect(dialog).toHaveTextContent("2 项")
    expect(dialog).toHaveTextContent("permanently")
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    await user.click(within(dialog).getByRole("button", { name: "Confirm batch action" }))
    expect(await screen.findByRole("status")).toHaveTextContent("已处理 1 项，1 项失败")
    expect(screen.queryByText("Active fixture")).not.toBeInTheDocument()
    expect(screen.getByText("Safe fixture")).toBeVisible()
    expect(screen.getByRole("toolbar", { name: "Batch actions" })).toHaveTextContent("已选择 1 项")
    await user.click(screen.getByRole("button", { name: "Retry failed items" }))
    expect(fetchMock.mock.calls[3][1]).toMatchObject({
      body: JSON.stringify({ action: "delete", ids: ["safe-entry-id"] }),
    })
    expect((fetchMock.mock.calls[1][1]?.headers as Record<string, string>)["Idempotency-Key"]).not.toBe(
      (fetchMock.mock.calls[3][1]?.headers as Record<string, string>)["Idempotency-Key"],
    )
    expect(screen.queryByText("Safe fixture")).not.toBeInTheDocument()
    fetchMock.mockRestore()
  })

  it("retains selection and claims no success when a batch result is unreadable", async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ requested: 1, succeeded: 1, failed: 0, results: [] })))
    render(<App />)
    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))
    await user.click(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" }))
    await user.click(screen.getByRole("button", { name: "永久归档" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to update entry. Please try again.")
    expect(screen.getByText("Active fixture")).toBeVisible()
    expect(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })).toBeChecked()
    fetchMock.mockRestore()
  })

  it.each([
    ["authentication", () => Promise.resolve(new Response(null, { status: 401 }))],
    ["transport", () => Promise.reject(new Error("network unavailable"))],
  ])("retains selection and claims no success on %s failure", async (_kind, response) => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementationOnce(response)
    render(<App />)
    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))
    await user.click(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" }))
    await user.click(screen.getByRole("button", { name: "永久归档" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to update entry. Please try again.")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.getByText("Active fixture")).toBeVisible()
    expect(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })).toBeChecked()
    fetchMock.mockRestore()
  })

  it("selects, clears, and exits only the current visible eligible Active set", async () => {
    const user = userEvent.setup()
    const visibleActive = {
      ...fixtureEntries[0],
      id: "second-active-fixture",
      pasteName: "Second active fixture",
    }
    render(<App initialEntries={[fixtureEntries[0], visibleActive, fixtureEntries[1]]} />)

    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))
    await user.click(screen.getByRole("button", { name: "全选" }))
    expect(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Select Second active fixture for batch action" })).toBeChecked()
    expect(
      screen.queryByRole("checkbox", { name: "Select Permanent archive fixture for batch action" }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "清空" }))
    expect(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Select Second active fixture for batch action" })).not.toBeChecked()

    await user.click(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" }))
    await user.click(screen.getByRole("button", { name: "Exit Batch Mode" }))
    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))
    expect(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })).not.toBeChecked()
  })

  it("prunes filtered, stale, unloaded, and archived IDs before future batch use", () => {
    const eligible = deriveVisibleEligibleActiveIds([fixtureEntries[0], fixtureEntries[1]], "active")
    expect(eligible).toEqual(new Set(["active-fixture"]))
    expect(pruneSelectedIds(new Set(["active-fixture", "permanent-archive-fixture", "stale-id"]), eligible)).toEqual(
      new Set(["active-fixture"]),
    )
    expect(
      pruneSelectedIds(new Set(["active-fixture"]), deriveVisibleEligibleActiveIds(fixtureEntries, "archived")),
    ).toEqual(new Set())
    expect(pruneSelectedIds(new Set(["active-fixture"]), null)).toEqual(new Set())
  })

  it("locks managed completion accessibly during Batch Mode and restores the Phase 6 chooser after exit", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch")
    render(<App />)
    const managedTask = screen.getByRole("checkbox", { name: "Complete managed entry" })

    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))
    expect(managedTask).toBeDisabled()
    expect(managedTask).toHaveAccessibleDescription(
      "Batch Mode is active. Use Batch Selectors or exit Batch Mode to complete an entry.",
    )
    await user.click(managedTask)
    managedTask.focus()
    await user.keyboard(" ")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Exit Batch Mode" }))
    expect(managedTask).not.toBeDisabled()
    await user.click(managedTask)
    expect(screen.getByRole("dialog", { name: "Choose completion action" })).toBeVisible()
    fetchMock.mockRestore()
  })

  it("enters and exits Batch Mode with a fresh transient selection", async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByRole("checkbox", { name: "Select Active fixture for batch action" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))
    expect(screen.getByRole("button", { name: "Exit Batch Mode" })).toBeVisible()
    expect(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })).not.toBeChecked()

    await user.click(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" }))
    expect(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })).toBeChecked()
    await user.click(screen.getByRole("button", { name: "Exit Batch Mode" }))
    expect(screen.queryByRole("checkbox", { name: "Select Active fixture for batch action" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))
    expect(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })).not.toBeChecked()
  })

  it("keeps BatchSelector markup, accessibility, and handlers separate from managed completion", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch")
    render(<App />)
    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))

    const selector = screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })
    const managedTask = screen.getByRole("checkbox", { name: "Complete managed entry" })
    expect(selector).toHaveClass("batch-selector")
    expect(managedTask).toHaveClass("managed-task")
    expect(selector.closest(".batch-selector")).not.toContainElement(managedTask)
    expect(managedTask).not.toBeChecked()
    await user.click(selector)
    expect(selector).toBeChecked()
    expect(managedTask).not.toBeChecked()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("Permanent archive fixture")).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    selector.focus()
    await user.keyboard(" ")
    expect(selector).not.toBeChecked()
    expect(managedTask).not.toBeChecked()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockRestore()
  })

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

  it("shows Restore for both permanent and timed Archive entries", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "归档" }))
    expect(screen.getByText("永久归档")).toBeVisible()
    expect(screen.getByRole("status", { name: /限期归档，剩余/ })).toBeVisible()
    expect(screen.getAllByRole("button", { name: "Restore" })[0]).toBeVisible()
    expect(screen.getAllByRole("button", { name: "Restore" })).toHaveLength(2)
  })

  it("keeps a timed Archive row and its countdown while restore is pending or fails", async () => {
    const user = userEvent.setup()
    let finish: ((response: Response) => void) | undefined
    const pendingRestore = new Promise<Response>((resolve) => {
      finish = resolve
    })
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockReturnValueOnce(pendingRestore)
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "归档" }))
    const restore = screen.getAllByRole("button", { name: "Restore" })[1]
    await user.click(restore)
    expect(restore).toBeDisabled()
    expect(screen.getByText("Timed archive fixture")).toBeVisible()
    expect(screen.getByRole("status", { name: /限期归档，剩余/ })).toBeVisible()
    finish!(new Response(JSON.stringify({ code: "RECONCILIATION_REQUIRED" }), { status: 503 }))
    expect(await screen.findByRole("alert")).toBeVisible()
    expect(screen.getByText("Timed archive fixture")).toBeVisible()
    expect(screen.getByRole("status", { name: /限期归档，剩余/ })).toBeVisible()
    fetchMock.mockRestore()
  })

  it("removes an expired Archive row only after confirmed authenticated reconciliation and retains it on failure", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(new Date("2031-01-01T00:00:00.000Z").getTime())
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "归档" }))
    await user.click(screen.getByRole("button", { name: "Reconcile archive" }))
    expect(screen.queryByText("Timed archive fixture")).not.toBeInTheDocument()
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "POST", credentials: "include" })
    expect((fetchMock.mock.calls[1][1]?.headers as Record<string, string>)["X-CSRF-Token"]).toBe("csrf-test")
    fetchMock.mockRestore()
    now.mockRestore()
  })

  it("keeps a permanent Archive row in place while restore is pending, then moves it only from the response", async () => {
    const user = userEvent.setup()
    let finish: ((response: Response) => void) | undefined
    const restoreResponse = new Promise<Response>((resolve) => {
      finish = resolve
    })
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockReturnValueOnce(restoreResponse)
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "归档" }))
    const restore = screen.getAllByRole("button", { name: "Restore" })[0]
    await user.click(restore)
    expect(restore).toBeDisabled()
    expect(screen.getByText("Permanent archive fixture")).toBeVisible()
    finish!(
      new Response(
        JSON.stringify({
          entry: {
            id: "permanent-archive-fixture",
            pasteName: "Restored fixture",
            publicUrl: "https://example.invalid/p/restored",
            visibility: "active",
            retentionMode: "permanent",
            expiresAt: null,
            version: 3,
          },
        }),
      ),
    )
    await waitFor(() => expect(screen.queryByText("Permanent archive fixture")).not.toBeInTheDocument())
    await user.click(screen.getByRole("tab", { name: "进行中" }))
    expect(screen.getByText("Restored fixture")).toBeVisible()
    const restoreRequest = fetchMock.mock.calls[1][1]
    expect(restoreRequest).toMatchObject({ method: "POST" })
    expect(restoreRequest).not.toHaveProperty("body")
    fetchMock.mockRestore()
  })

  it("retains a permanent Archive row and hides server details when restore fails", async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-test" })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "RECONCILIATION_REQUIRED", secret: "do-not-display" }), { status: 503 }),
      )
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "归档" }))
    await user.click(screen.getAllByRole("button", { name: "Restore" })[0])
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to update entry. Please try again.")
    expect(screen.getByText("Permanent archive fixture")).toBeVisible()
    expect(screen.queryByText("do-not-display")).not.toBeInTheDocument()
    fetchMock.mockRestore()
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
    const archive = screen.getByText("Authoritative archive").closest("article")
    if (!archive) throw new Error("expected authoritative archive row")
    expect(within(archive).getByRole("status", { name: /限期归档，剩余/ })).toBeVisible()
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
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to update entry. Please try again.")
    expect(screen.getByRole("dialog")).toHaveFocus()
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
    await user.click(screen.getByRole("button", { name: "永久归档" }))
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

  it("uses a new completion identity when the selected action changes", async () => {
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
              pasteName: "Authoritative timed archive",
              publicUrl: "https://example.invalid/p/authoritative",
              visibility: "archived",
              retentionMode: "timed",
              expiresAt: "2031-02-03T04:05:06.000Z",
              version: 4,
            },
          }),
        ),
      )
    render(<App />)

    await user.click(screen.getByRole("checkbox", { name: "Complete managed entry" }))
    await user.click(screen.getByRole("button", { name: "Confirm archive" }))
    expect(await screen.findByRole("alert")).toBeVisible()
    await user.click(screen.getByRole("button", { name: "限期归档" }))
    await user.click(screen.getByRole("button", { name: "Confirm archive" }))
    await waitFor(() => expect(screen.queryByText("Active fixture")).not.toBeInTheDocument())

    const firstRequest = fetchMock.mock.calls[1][1]
    const changedActionRequest = fetchMock.mock.calls[3][1]
    if (!firstRequest || !changedActionRequest) throw new Error("expected completion requests")
    const firstHeaders = firstRequest.headers as Record<string, string>
    const changedActionHeaders = changedActionRequest.headers as Record<string, string>
    expect(changedActionHeaders["Idempotency-Key"]).not.toBe(firstHeaders["Idempotency-Key"])
    expect(JSON.parse(changedActionRequest.body as string)).toEqual({ action: "archive_expiring" })
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
