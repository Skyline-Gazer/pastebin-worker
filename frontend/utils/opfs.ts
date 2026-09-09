export async function stageDownloadBytes(bytes: Uint8Array, filename: string): Promise<string> {
  const blob = new Blob([bytes as BlobPart])
  let root: FileSystemDirectoryHandle | undefined
  let handle: FileSystemFileHandle | undefined
  let stagingName: string | undefined
  try {
    root = await navigator.storage.getDirectory()
    stagingName = `pb-dl-${crypto.randomUUID()}`
    handle = await root.getFileHandle(stagingName, { create: true })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    const file = await handle.getFile()
    return URL.createObjectURL(new File([file], filename))
  } catch {
    return URL.createObjectURL(blob)
  } finally {
    if (root && handle && stagingName) {
      await wipeAndRemoveStagedFile(root, handle, stagingName)
    }
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
      if (attempt === 1) {
        queueMicrotask(() => {
          void navigator.storage
            .getDirectory()
            .then((laterRoot) => laterRoot.removeEntry(filename))
            .catch(() => undefined)
        })
      }
    }
  }
}
