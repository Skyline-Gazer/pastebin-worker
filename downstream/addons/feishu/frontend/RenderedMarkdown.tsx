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
    input.setAttribute("disabled", "")
  })
  return documentFragment.body.innerHTML
}

export function RenderedMarkdown({ content }: { content: string }) {
  return <div className="rendered-markdown" dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(content) }} />
}
