import { useEffect, useMemo, useRef } from "react"
import { marked } from "marked"
import { filterXSS } from "xss"

const markdownAllowList = {
  a: ["href", "title"],
  blockquote: [],
  br: [],
  code: [],
  del: [],
  em: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  hr: [],
  input: ["type", "checked", "disabled"],
  li: [],
  ol: [],
  p: [],
  pre: [],
  strong: [],
  table: [],
  tbody: [],
  td: [],
  th: [],
  thead: [],
  tr: [],
  ul: [],
}

function renderSafeMarkdown(content: string) {
  const parsed = marked.parse(content, { async: false, gfm: true })
  const sanitized = filterXSS(parsed, {
    allowList: markdownAllowList,
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
  })
  const documentFragment = new DOMParser().parseFromString(sanitized, "text/html")
  documentFragment.querySelectorAll("input").forEach((input) => {
    if (input.type !== "checkbox") {
      input.remove()
      return
    }
    input.setAttribute("aria-label", "Markdown task")
  })
  return documentFragment.body.innerHTML
}

export function RenderedMarkdown({
  content,
  interactive = false,
  onTaskActivate,
}: {
  content: string
  interactive?: boolean
  onTaskActivate?: (control: HTMLInputElement) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const activateRef = useRef(onTaskActivate)
  activateRef.current = onTaskActivate
  const markup = useMemo(() => ({ __html: renderSafeMarkdown(content) }), [content])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
      input.disabled = !interactive
    })
    if (!interactive) return
    function revert(target: HTMLInputElement) {
      target.checked = target.hasAttribute("checked")
    }
    function intercept(event: Event) {
      const target = event.target
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox" || target.disabled) return
      event.preventDefault()
      revert(target)
      if (event.type === "click") activateRef.current?.(target)
      queueMicrotask(() => revert(target))
    }
    root.addEventListener("click", intercept, true)
    root.addEventListener("change", intercept, true)
    return () => {
      root.removeEventListener("click", intercept, true)
      root.removeEventListener("change", intercept, true)
    }
  }, [markup, interactive])

  return <div className="rendered-markdown" dangerouslySetInnerHTML={markup} ref={rootRef} />
}
