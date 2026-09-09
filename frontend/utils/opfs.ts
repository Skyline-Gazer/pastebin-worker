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
    await wipeAndRemoveStagedFile(root, handle, filename)
    return objectUrl
  } catch {
    return URL.createObjectURL(blob)
  }
}

async function wipeAndRemoveStagedFile(
  root: FileSystemDirectoryHandle,
  handle: FileSystemFileHandle,
  filename: string,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const writable = await handle.createWritable({ keepExistingData: false })
      await writable.write(new Uint8Array(0))
      await writable.close()
      break
    } catch {
      if (attempt === 1) break
    }
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await root.removeEntry(filename)
      return
    } catch {
      if (attempt === 1) return
    }
  }
}
