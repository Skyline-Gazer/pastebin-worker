import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { App } from "./App"

describe("Feishu frontend shell", () => {
  it("renders a named, compact content-first page without loading browser data", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")

    render(<App />)

    expect(screen.getByRole("main", { name: "Feishu Pastebin" })).toHaveClass("page-shell")
    expect(screen.getByRole("heading", { name: "Feishu Pastebin" })).toBeVisible()
    expect(screen.getByText("Frontend baseline")).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockRestore()
  })

  it("offers an accessible theme control and applies the selected local theme", async () => {
    const user = userEvent.setup()

    render(<App />)

    const themeControl = screen.getByRole("button", { name: "Switch to dark theme" })
    await user.click(themeControl)

    expect(document.documentElement).toHaveAttribute("data-theme", "dark")
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeVisible()
  })
})
