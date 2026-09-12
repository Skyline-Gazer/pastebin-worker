import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { App } from "./App"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("Feishu production boot", () => {
  it("does not render fixture entries as the production default", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "UNAUTHENTICATED", brand: "Feishu" }), { status: 401 }),
    )
    render(<App />)
    await waitFor(() => expect(screen.getByRole("link", { name: "Sign in with Feishu" })).toBeVisible())
    expect(screen.queryByText("Active fixture")).not.toBeInTheDocument()
    expect(screen.queryByText("Permanent archive fixture")).not.toBeInTheDocument()
    expect(screen.queryByText("Timed archive fixture")).not.toBeInTheDocument()
  })

  it("offers Lark login copy when the session brand is Lark", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "UNAUTHENTICATED", brand: "Lark" }), { status: 401 }),
    )
    render(<App />)
    await waitFor(() => expect(screen.getByRole("link", { name: "Sign in with Lark" })).toBeVisible())
    expect(screen.queryByRole("link", { name: "Sign in with Feishu" })).not.toBeInTheDocument()
    expect(screen.queryByText("Active fixture")).not.toBeInTheDocument()
  })

  it("shows ERROR instead of fixtures when the authenticated list fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf", expiresAt: "2030-01-01T00:00:00.000Z" })))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
    render(<App />)
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unable to load entries."))
    expect(screen.queryByText("Active fixture")).not.toBeInTheDocument()
  })

  it("shows EMPTY when the authenticated principal has no bindings", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf", expiresAt: "2030-01-01T00:00:00.000Z" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ entries: [] })))
    render(<App />)
    await waitFor(() => expect(screen.getByText("暂无条目")).toBeVisible())
    expect(screen.queryByText("Active fixture")).not.toBeInTheDocument()
  })

  it("refreshes live Markdown from GET /api/entries after completion", async () => {
    const user = userEvent.setup()
    const liveEntry = {
      id: "live-entry",
      pasteName: "Live entry",
      publicUrl: "https://pb.223.im/abcd",
      content: "- [ ] live Markdown task",
      visibility: "active",
      retentionMode: "permanent",
      expiresAt: null,
      version: 1,
      managedTask: { state: "unchecked" },
    }
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf", expiresAt: "2030-01-01T00:00:00.000Z" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ entries: [liveEntry] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf", expiresAt: "2030-01-01T00:00:00.000Z" })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            entry: {
              id: "live-entry",
              pasteName: "Live entry",
              publicUrl: "https://pb.223.im/abcd",
              visibility: "archived",
              retentionMode: "permanent",
              expiresAt: null,
              version: 2,
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            entries: [
              {
                ...liveEntry,
                content: "- [x] live Markdown task",
                visibility: "archived",
                version: 2,
                managedTask: { state: "checked" },
              },
            ],
          }),
        ),
      )
    render(<App />)
    await waitFor(() => expect(screen.getByText("Live entry")).toBeVisible())
    expect(screen.getByRole("checkbox", { name: "Markdown task" })).not.toBeChecked()
    await user.click(screen.getByRole("checkbox", { name: "Complete managed entry" }))
    await user.click(screen.getByRole("button", { name: "永久归档" }))
    await user.click(screen.getByRole("button", { name: "Confirm archive" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await user.click(screen.getByRole("tab", { name: "归档" }))
    const archived = screen.getByText("Live entry").closest("article")
    if (!archived) throw new Error("expected archived live row")
    expect(within(archived).getByRole("checkbox", { name: "Markdown task" })).toBeChecked()
  })
})
