export async function stageDownloadBytes(bytes: Uint8Array, filename: string): Promise<string> {
  const blob = new Blob([bytes as BlobPart])
  try {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(filename, { create: true })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    const file = await handle.getFile()
    const objectUrl = URL.createObjectURL(file)
    try {
      await root.removeEntry(filename)
    } catch {
      // Best-effort: the object URL already holds the bytes.
    }
    return objectUrl
  } catch {
    return URL.createObjectURL(blob)
  }
}
