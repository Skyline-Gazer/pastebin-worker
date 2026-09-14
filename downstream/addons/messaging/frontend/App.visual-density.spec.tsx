import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { App } from "./App"
import { fixtureEntries } from "./fixtures"

const singleLine = {
  ...fixtureEntries[0],
  id: "single-line",
  pasteName: "single-line",
  publicUrl: "https://example.invalid/single-line",
  content: "SEND_FT_CREATE_20260912_01",
  managedTask: { state: "unchecked" as const },
}

describe("FT-DEFECT-02 visual density remediation", () => {
  it("does not keep a standalone Exit Batch Mode control", () => {
    render(<App initialEntries={fixtureEntries} />)
    expect(screen.queryByRole("button", { name: "Enter Batch Mode" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Exit Batch Mode" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "批量管理" })).toBeVisible()
  })

  it("keeps batch selectors out of the DOM until Batch Mode and then leads the row", async () => {
    const user = userEvent.setup()
    render(<App initialEntries={[singleLine]} />)
    expect(screen.queryByRole("checkbox", { name: "选择 SEND_FT_CREATE_20260912_01" })).not.toBeInTheDocument()
    expect(screen.queryByText("Batch select")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "批量管理" }))
    const row = screen.getByRole("article", { name: "SEND_FT_CREATE_20260912_01" })
    const selector = within(row).getByRole("checkbox", { name: "选择 SEND_FT_CREATE_20260912_01" })
    expect(selector).toBeVisible()
    expect(row.textContent).not.toContain("Batch select")
    expect(row.querySelector(".batch-selector")).toBe(selector)
  })

  it("puts batch controls in one toolbar region", async () => {
    const user = userEvent.setup()
    render(<App initialEntries={[singleLine, { ...singleLine, id: "second", pasteName: "second" }]} />)
    await user.click(screen.getByRole("button", { name: "批量管理" }))
    const toolbar = screen.getByRole("toolbar", { name: "批量管理" })
    expect(within(toolbar).getByRole("button", { name: "全选" })).toBeVisible()
    expect(within(toolbar).getByRole("button", { name: "清除" })).toBeVisible()
    expect(within(toolbar).getByRole("button", { name: "永久归档" })).toBeVisible()
    expect(within(toolbar).getByRole("button", { name: "限期归档" })).toBeVisible()
    expect(within(toolbar).getByRole("button", { name: "删除" })).toBeVisible()
    expect(within(toolbar).getByRole("button", { name: "完成" })).toBeVisible()
    expect(toolbar).toHaveTextContent("已选择 0 / 2")
    expect(screen.queryByRole("button", { name: "Exit Batch Mode" })).not.toBeInTheDocument()
  })

  it("does not duplicate a single-line Paste as body content", () => {
    render(<App initialEntries={[singleLine]} />)
    const row = screen.getByRole("article", { name: "SEND_FT_CREATE_20260912_01" })
    expect(within(row).getAllByText("SEND_FT_CREATE_20260912_01")).toHaveLength(1)
    expect(row.querySelector(".markdown-content")).not.toBeInTheDocument()
  })

  it("previews multi-line plain text without repeating the title line", () => {
    render(
      <App
        initialEntries={[
          {
            ...singleLine,
            id: "weekly",
            pasteName: "weekly",
            content: "Weekly notes\nsecond line\nthird line",
          },
        ]}
      />,
    )
    const row = screen.getByRole("article", { name: "Weekly notes" })
    expect(row.textContent).toMatch(/second line/)
    expect(row.textContent).toMatch(/third line/)
    expect(within(row).getAllByRole("heading", { name: "Weekly notes" })).toHaveLength(1)
  })

  it("keeps a first-line GFM task interactive", async () => {
    const user = userEvent.setup()
    render(<App initialEntries={fixtureEntries} />)
    const task = screen.getAllByRole("checkbox", { name: "Markdown task" })[0]
    await user.click(task)
    expect(screen.getByRole("dialog", { name: "选择完成操作" })).toBeVisible()
  })

  it("uses an accessible icon-only theme control and Chinese operational labels", async () => {
    const user = userEvent.setup()
    render(<App initialEntries={fixtureEntries} />)
    const theme = screen.getByRole("button", { name: "切换到深色主题" })
    expect(theme).not.toHaveTextContent("切换到深色主题")
    expect(screen.getByRole("button", { name: "退出" })).toBeVisible()
    expect(screen.getByText("Feishu")).toBeVisible()
    expect(screen.queryByText("Feishu / Lark Add-on")).not.toBeInTheDocument()
    expect(screen.queryByText("Log out")).not.toBeInTheDocument()
    const row = screen.getByRole("article", { name: /first Markdown task/i })
    expect(within(row).getByRole("link", { name: "打开" })).toBeVisible()
    expect(within(row).getByRole("button", { name: "复制链接" })).toBeVisible()
    expect(within(row).getByRole("button", { name: "更多" })).toBeVisible()
    await user.click(theme)
    expect(document.documentElement).toHaveClass("dark")
  })

  it("keeps file Download on ?a", () => {
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
    expect(screen.getByRole("link", { name: "下载" })).toHaveAttribute("href", "https://example.invalid/filepaste?a")
  })

  it("keeps Active and Archive tabs with counts", async () => {
    const user = userEvent.setup()
    render(<App initialEntries={fixtureEntries} />)
    expect(screen.getByRole("tab", { name: /进行中/ })).toHaveTextContent("1")
    expect(screen.getByRole("tab", { name: /归档/ })).toHaveTextContent("2")
    await user.click(screen.getByRole("tab", { name: /归档/ }))
    expect(screen.getAllByRole("button", { name: "恢复" })).toHaveLength(2)
  })

  it("bounds desktop content width without overflow-prone page shells", () => {
    render(<App initialEntries={fixtureEntries} />)
    const main = screen.getByRole("main")
    expect(main.className).toMatch(/max-w-\[64rem\]/)
    expect(main.className).not.toMatch(/w-screen|overflow-x-scroll|min-w-\[12[0-9]{2}/)
    expect(document.querySelector(".page-shell, .fixture-entry")).not.toBeInTheDocument()
    const row = screen.getByRole("article", { name: /first Markdown task/i })
    expect(row.className).toMatch(/grid-cols-1/)
    expect(row.className).toMatch(/md:grid-cols-\[minmax\(0,1fr\)_auto\]/)
    expect(row.className).not.toMatch(/min-w-\[3[0-9]{2}|w-\[14[0-9]{2}/)
  })
})
