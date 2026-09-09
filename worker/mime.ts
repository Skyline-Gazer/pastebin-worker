import mime from "mime"
import { sniffMimeType } from "../shared/mimeSniff.js"

const SNIFF_BYTES = 16

export async function storedMimeTypeForUpload(
  env: Env,
  pasteName: string,
  content: ArrayBuffer | ReadableStream,
  options: { filename?: string; encryptionScheme?: string; isMPUComplete: boolean },
): Promise<string | undefined> {
  if (options.encryptionScheme) return undefined
  if (options.filename && mime.getType(options.filename)) return undefined

  let header: Uint8Array | undefined
  if (options.isMPUComplete) {
    const object = await env.R2.get(pasteName, { range: { offset: 0, length: SNIFF_BYTES } })
    if (object === null) return undefined
    header = new Uint8Array(await object.arrayBuffer())
  } else if (content instanceof ArrayBuffer) {
    header = new Uint8Array(content.slice(0, SNIFF_BYTES))
  } else if (ArrayBuffer.isView(content)) {
    header = new Uint8Array(content.buffer, content.byteOffset, Math.min(SNIFF_BYTES, content.byteLength))
  }
  return header ? sniffMimeType(header) : undefined
}
