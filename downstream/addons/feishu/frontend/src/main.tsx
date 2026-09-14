import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "../App"
import "../style.css"

const root = document.getElementById("root")

if (!root) {
  throw new Error("Feishu frontend root is unavailable")
}

const mountRoot = root

async function mount() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "1") {
    const { visualPreviewEntries } = await import("../visual-preview-fixtures")
    createRoot(mountRoot).render(
      <StrictMode>
        <App initialEntries={visualPreviewEntries} />
      </StrictMode>,
    )
    return
  }
  createRoot(mountRoot).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void mount()
