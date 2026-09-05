import { useEffect, useState } from "react"
import { fixtureEntries, type FixtureEntry } from "./fixtures"
import { ManagedTaskCheckbox } from "./ManagedTaskCheckbox"
import { RenderedMarkdown } from "./RenderedMarkdown"

type Theme = "light" | "dark"
type Tab = "active" | "archived"

function archiveLabel(entry: FixtureEntry) {
  return entry.retentionMode === "permanent" ? "永久归档" : `限期归档：${entry.expiresAt}`
}

export function App() {
  const [theme, setTheme] = useState<Theme>("light")
  const [tab, setTab] = useState<Tab>("active")
  const nextTheme = theme === "light" ? "dark" : "light"
  const visibleEntries = fixtureEntries.filter((entry) => entry.visibility === tab)

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
          <div aria-label="Fixture views" role="tablist" className="view-tabs">
            <button
              aria-controls="fixture-panel"
              aria-selected={tab === "active"}
              onClick={() => setTab("active")}
              role="tab"
              type="button"
            >
              进行中
            </button>
            <button
              aria-controls="fixture-panel"
              aria-selected={tab === "archived"}
              onClick={() => setTab("archived")}
              role="tab"
              type="button"
            >
              归档
            </button>
          </div>
          <section id="fixture-panel" aria-label={tab === "active" ? "进行中" : "归档"} role="tabpanel">
            {visibleEntries.map((entry) => (
              <article className="fixture-entry" key={entry.id}>
                <h2>{entry.pasteName}</h2>
                {tab === "active" ? (
                  <ManagedTaskCheckbox checked={entry.managedTask.state === "checked"} />
                ) : (
                  <p className="archive-label">{archiveLabel(entry)}</p>
                )}
                <RenderedMarkdown content={entry.content} />
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  )
}
