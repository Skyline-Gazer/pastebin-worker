import { useEffect, useState } from "react"

type Theme = "light" | "dark"

export function App() {
  const [theme, setTheme] = useState<Theme>("light")
  const nextTheme = theme === "light" ? "dark" : "light"

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <main aria-label="Feishu Pastebin" className="page-shell">
      <section className="content-panel" aria-labelledby="page-title">
        <header className="shell-header">
          <div>
            <p className="eyebrow">Feishu Add-on</p>
            <h1 id="page-title">Feishu Pastebin</h1>
          </div>
          <button type="button" className="theme-control" onClick={() => setTheme(nextTheme)}>
            Switch to {nextTheme} theme
          </button>
        </header>
        <div className="shell-body">
          <p className="eyebrow">Frontend baseline</p>
          <p>Content rendering will be available in a later increment.</p>
        </div>
      </section>
    </main>
  )
}
