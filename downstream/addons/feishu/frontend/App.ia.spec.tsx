import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { App } from "./App"
import { fixtureEntries } from "./fixtures"

describe("FT-DEFECT-02 information architecture", () => {
  it("shows both Continue with Feishu and Continue with Lark from session providers", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "UNAUTHENTICATED", brand: "Feishu", providers: ["feishu", "lark"] }), {
        status: 401,
      }),
    )
    render(<App />)
    await waitFor(() => expect(screen.getByRole("link", { name: "Continue with Feishu" })).toBeVisible())
    expect(screen.getByRole("link", { name: "Continue with Feishu" })).toHaveAttribute("href", "/api/auth/login/feishu")
    expect(screen.getByRole("link", { name: "Continue with Lark" })).toHaveAttribute("href", "/api/auth/login/lark")
    expect(screen.queryByRole("link", { name: "Sign in with Feishu" })).not.toBeInTheDocument()
  })

  it("hides a disabled provider login", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "UNAUTHENTICATED", brand: "Feishu", providers: ["feishu"] }), {
        status: 401,
      }),
    )
    render(<App />)
    await waitFor(() => expect(screen.getByRole("link", { name: "Continue with Feishu" })).toBeVisible())
    expect(screen.queryByRole("link", { name: "Continue with Lark" })).not.toBeInTheDocument()
  })

  it("shows the session provider badge and logout, not hostname guesses", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            csrfToken: "csrf",
            expiresAt: "2030-01-01T00:00:00.000Z",
            brand: "Lark",
            providers: ["feishu", "lark"],
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ entries: [] })))
    render(<App />)
    await waitFor(() => expect(screen.getByText("Lark")).toBeVisible())
    expect(screen.getByRole("button", { name: "Log out" })).toBeVisible()
    expect(screen.queryByText("Feishu")).not.toBeInTheDocument()
  })

  it("titles text cards from the first line, Untitled fallback, and 80-char cap", () => {
    const long = ` ${"a".repeat(81)}\nsecond`
    render(
      <App
        initialEntries={[
          { ...fixtureEntries[0], content: "\n  Weekly notes  \nbody", publicUrl: "https://example.invalid/weekly" },
          {
            ...fixtureEntries[0],
            id: "blank-title",
            pasteName: "blank-title",
            content: "   \n",
            publicUrl: "https://example.invalid/blank",
          },
          {
            ...fixtureEntries[0],
            id: "long-title",
            pasteName: "long-title",
            content: long,
            publicUrl: "https://example.invalid/long",
          },
        ]}
      />,
    )
    expect(screen.getByRole("heading", { name: "Weekly notes" })).toBeVisible()
    expect(screen.getByRole("heading", { name: "Untitled" })).toBeVisible()
    expect(screen.getByRole("heading", { name: `${"a".repeat(80)}…` })).toBeVisible()
    expect(screen.queryByRole("heading", { name: "weekly" })).not.toBeInTheDocument()
  })

  it("renders Open and Copy URL from publicUrl and never uses pasteName as the heading", () => {
    render(<App initialEntries={fixtureEntries} />)
    const card = screen.getByRole("article", { name: /first Markdown task/i })
    expect(within(card).getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "https://example.invalid/d/active-fixture",
    )
    expect(within(card).getByRole("button", { name: "Copy URL" })).toBeVisible()
    expect(within(card).getByText("Active fixture")).toBeVisible()
    expect(screen.queryByRole("heading", { name: "Active fixture" })).not.toBeInTheDocument()
  })

  it("renders a file card only with honest metadata and Download ?a", () => {
    render(
      <App
        initialEntries={[
          {
            ...fixtureEntries[0],
            id: "file-entry",
            pasteName: "filepaste",
            publicUrl: "https://example.invalid/filepaste",
            content: null,
            kind: "file",
            filename: "cat.png",
            mimeType: "image/png",
            sizeBytes: 12,
            managedTask: { state: "unchecked" },
          },
        ]}
      />,
    )
    expect(screen.getByText("cat.png")).toBeVisible()
    expect(screen.getByText("image/png")).toBeVisible()
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute(
      "href",
      "https://example.invalid/filepaste?a",
    )
    expect(screen.queryByRole("link", { name: "Download" })?.getAttribute("href")).not.toContain("/d/")
    expect(screen.queryByRole("checkbox", { name: "Complete managed entry" })).not.toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: "Markdown task" })).not.toBeInTheDocument()
  })

  it("does not invent a file card from pasteName or dump a ManagedTaskCheckbox on ordinary text", () => {
    render(
      <App
        initialEntries={[
          {
            ...fixtureEntries[0],
            content: "Plain note without a task",
            publicUrl: "https://example.invalid/plain",
          },
        ]}
      />,
    )
    expect(screen.getByRole("heading", { name: "Plain note without a task" })).toBeVisible()
    expect(screen.queryByRole("link", { name: "Download" })).not.toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: "Complete managed entry" })).not.toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: "Markdown task" })).not.toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: /Select .* for batch action/ })).not.toBeInTheDocument()
  })

  it("keeps real GFM tasks interactive and does not mutate on cancel", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch")
    render(<App initialEntries={fixtureEntries} />)
    const task = screen.getAllByRole("checkbox", { name: "Markdown task" })[0]
    await user.click(task)
    expect(task).not.toBeChecked()
    expect(screen.getByRole("dialog", { name: "Choose completion action" })).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(task).not.toBeChecked()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("shows batch selectors only in Batch Mode and delete uses an alert dialog", async () => {
    const user = userEvent.setup()
    render(<App initialEntries={fixtureEntries} />)
    expect(screen.queryByRole("checkbox", { name: "Select Active fixture for batch action" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Enter Batch Mode" }))
    expect(screen.getByRole("checkbox", { name: "Select Active fixture for batch action" })).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Exit Batch Mode" }))
    const menu = screen.getByRole("button", { name: "Lifecycle actions" })
    await user.click(menu)
    await user.click(screen.getByRole("menuitem", { name: "删除" }))
    expect(screen.getByRole("alertdialog", { name: "Confirm delete" })).toBeVisible()
  })

  it("shows loading, empty, and error states without fixture chrome", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => undefined))
    const { unmount } = render(<App />)
    expect(screen.getByText(/Loading/i)).toBeVisible()
    unmount()
    vi.restoreAllMocks()
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf", expiresAt: "2030-01-01T00:00:00.000Z", brand: "Feishu" })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ entries: [] })))
    render(<App />)
    await waitFor(() => expect(screen.getByText("暂无条目")).toBeVisible())
  })

  it("keeps long Markdown from using known horizontal overflow classes on the page shell", () => {
    render(
      <App
        initialEntries={[
          {
            ...fixtureEntries[0],
            content: "LongContent ".repeat(80),
            publicUrl: "https://example.invalid/longbody",
          },
        ]}
      />,
    )
    expect(screen.getByRole("main")).not.toHaveClass("page-shell")
    expect(document.querySelector(".page-shell, .fixture-entry")).not.toBeInTheDocument()
    expect(screen.getByRole("main").className).not.toMatch(/overflow-x-scroll/)
  })

  it("drives dark mode with .dark instead of data-theme", async () => {
    const user = userEvent.setup()
    render(<App initialEntries={fixtureEntries} />)
    expect(document.documentElement).toHaveClass("light")
    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }))
    expect(document.documentElement).toHaveClass("dark")
    expect(document.documentElement).not.toHaveAttribute("data-theme")
  })
})
