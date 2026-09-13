import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false
}
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => undefined
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => undefined
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  document.documentElement.classList.remove("dark", "light")
  delete document.documentElement.dataset.theme
})

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false
}
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => undefined
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => undefined
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined
}

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove("dark", "light")
  delete document.documentElement.dataset.theme
})
