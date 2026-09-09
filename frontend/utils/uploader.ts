import type { PasteSetting } from "../components/PasteSettingPanel.js"
import type { PasteEditState } from "../components/PasteInputPanel.js"
import { ErrorWithTitle } from "./utils.js"
import type { PasteResponse } from "../../shared/interfaces.js"
import type { EncryptionScheme } from "./encryption.js"
import { encodeKey, encrypt, genKey } from "./encryption.js"
import type { UploadOptions } from "../../shared/uploadPaste.js"
import { UploadError, uploadMPU, uploadNormal } from "../../shared/uploadPaste.js"
import { DEFAULT_EDIT_FILENAME } from "../../shared/constants.js"
import { buildZipArchive, shouldZipFiles } from "./zipArchive.js"

async function genAndEncrypt(scheme: EncryptionScheme, content: string | Uint8Array) {
  const key = await genKey(scheme)
  const plaintext = typeof content === "string" ? new TextEncoder().encode(content) : content
  const ciphertext = await encrypt(scheme, key, plaintext)
  return { key: await encodeKey(key), ciphertext }
}

const encryptionScheme: EncryptionScheme = "AES-GCM"

const mpuChunkSize = 5 * 1024 * 1024
const mpuThreshold = 5 * 1024 * 1024

export interface UploadProgress {
  doneBytes: number
  totalBytes: number
}

function selectedFiles(editorState: PasteEditState): File[] {
  if (editorState.files.length > 0) return editorState.files
  return editorState.file ? [editorState.file] : []
}

export async function prepareUploadContent(
  editorState: PasteEditState,
  doEncrypt: boolean,
  onEncryptionKeyChange: (k: string | undefined) => void,
): Promise<File> {
  let file: File
  if (editorState.editKind === "file") {
    const files = selectedFiles(editorState)
    if (files.length === 0) {
      throw new ErrorWithTitle("Error on Preparing Upload", "No file selected")
    }
    if (shouldZipFiles(files.length, editorState.fromDirectory)) {
      file = await buildZipArchive(files, { fromDirectory: editorState.fromDirectory })
    } else {
      const only = files[0]
      if (!only) {
        throw new ErrorWithTitle("Error on Preparing Upload", "No file selected")
      }
      file = only
    }
  } else {
    if (editorState.editContent.length === 0) {
      throw new ErrorWithTitle("Error on Preparing Upload", "Empty paste")
    }
    file = new File([editorState.editContent], editorState.editFilename || DEFAULT_EDIT_FILENAME)
  }

  if (doEncrypt) {
    const { key, ciphertext } = await genAndEncrypt(encryptionScheme, await file.bytes())
    onEncryptionKeyChange(key)
    return new File([ciphertext as BlobPart], file.name)
  }
  onEncryptionKeyChange(undefined)
  return file
}

export async function uploadPaste(
  pasteSetting: PasteSetting,
  editorState: PasteEditState,
  onEncryptionKeyChange: (k: string | undefined) => void, // we only generate key on upload, so need a callback of key generation
  config: Env,
  onProgress?: (progress: UploadProgress | undefined) => void,
  signal?: AbortSignal,
): Promise<PasteResponse> {
  const options: UploadOptions = {
    content: await prepareUploadContent(editorState, pasteSetting.doEncrypt, onEncryptionKeyChange),
    isUpdate: pasteSetting.uploadKind === "manage",
    isPrivate: pasteSetting.uploadKind === "long",
    password: pasteSetting.password.length ? pasteSetting.password : undefined,
    expire: pasteSetting.expiration,
    name: pasteSetting.uploadKind === "custom" ? pasteSetting.name : undefined,
    highlightLanguage: editorState.editKind === "edit" ? editorState.editHighlightLang : undefined,
    encryptionScheme: pasteSetting.doEncrypt ? encryptionScheme : undefined,
    manageUrl: pasteSetting.manageUrl,
  }

  const contentLength = options.content.size
  const reportProgress = (doneBytes: number, totalBytes: number) => {
    if (onProgress) onProgress({ doneBytes, totalBytes })
  }

  try {
    if (onProgress) onProgress({ doneBytes: 0, totalBytes: contentLength })
    if (contentLength <= mpuThreshold) {
      return await uploadNormal(config.DEPLOY_URL, options, reportProgress, signal)
    } else {
      return await uploadMPU(config.DEPLOY_URL, mpuChunkSize, options, reportProgress, undefined, signal)
    }
  } catch (e) {
    if (e instanceof UploadError) {
      throw new ErrorWithTitle("Error on Upload", e.message)
    }
    throw e
  } finally {
    if (onProgress) onProgress(undefined)
  }
}
