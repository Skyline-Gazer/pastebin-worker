import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { App } from "./App"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("Feishu production boot", () => {
  it("does not render fixture entries as the production default", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }))
    render(<App />)
    await waitFor(() => expect(screen.getByRole("link", { name: "Sign in with Feishu" })).toBeVisible())
    expect(screen.queryByText("Active fixture")).not.toBeInTheDocument()
    expect(screen.queryByText("Permanent archive fixture")).not.toBeInTheDocument()
    expect(screen.queryByText("Timed archive fixture")).not.toBeInTheDocument()
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
})
