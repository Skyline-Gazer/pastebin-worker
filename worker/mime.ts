import mime from "mime"
import { detectUtf8 } from "../shared/encoding.js"
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
  let body: Uint8Array | undefined
  if (options.isMPUComplete) {
    const object = await env.R2.get(pasteName, { range: { offset: 0, length: SNIFF_BYTES } })
    if (object === null) return undefined
    header = new Uint8Array(await object.arrayBuffer())
  } else if (content instanceof ArrayBuffer) {
    body = new Uint8Array(content)
    header = body.subarray(0, SNIFF_BYTES)
  } else if (ArrayBuffer.isView(content)) {
    body = new Uint8Array(content.buffer, content.byteOffset, content.byteLength)
    header = body.subarray(0, Math.min(SNIFF_BYTES, body.byteLength))
  }
  const sniffed = header ? sniffMimeType(header) : undefined
  if (sniffed) return sniffed
  const sample = body ?? header
  if (sample && detectUtf8(sample) === null) return "application/octet-stream"
  return undefined
}
