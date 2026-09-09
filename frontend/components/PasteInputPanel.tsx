import type { CardProps } from "./ui/index.js"
import { Card, CardBody, Tab, Tabs } from "./ui/index.js"
import type { DragEvent } from "react"
import { useRef, useState } from "react"
import { formatSize, verifyFileSize } from "../utils/utils.js"
import { shouldZipFiles } from "../utils/zipArchive.js"
import { XIcon } from "./icons.js"
import { cardOverrides, tst } from "../utils/overrides.js"
import { CodeEditor } from "./CodeEditor.js"

export type EditKind = "edit" | "file"

export interface PasteEditState {
  editKind: EditKind
  editContent: string
  editFilename?: string
  editHighlightLang?: string
  file: File | null
  files: File[]
  fromDirectory: boolean
}

interface PasteEditorProps extends CardProps {
  isPasteLoading: boolean
  state: PasteEditState
  onStateChange: (state: PasteEditState) => void
  config: Env
  showModal: (title: string, content: string) => void
}

export function PasteInputPanel({
  isPasteLoading,
  state,
  onStateChange,
  config,
  showModal,
  ...rest
}: PasteEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const directoryInput = useRef<HTMLInputElement>(null)
  const [isDragged, setDragged] = useState<boolean>(false)
  const [isEditDragged, setEditDragged] = useState<boolean>(false)

  const selected = state.files.length > 0 ? state.files : state.file ? [state.file] : []
  const zipping = shouldZipFiles(selected.length, state.fromDirectory)
  const selectedBytes = selected.reduce((sum, file) => sum + file.size, 0)

  function resetFileInputs() {
    if (fileInput.current) fileInput.current.value = ""
    if (directoryInput.current) directoryInput.current.value = ""
  }

  function setFiles(next: File[], fromDirectory: boolean) {
    if (next.length === 0) {
      resetFileInputs()
      onStateChange({ ...state, editKind: "file", file: null, files: [], fromDirectory: false })
      return
    }
    let total = 0
    for (const file of next) {
      const [ok, msg] = verifyFileSize(file.size, config)
      if (!ok) {
        showModal("File too large", msg)
        resetFileInputs()
        return
      }
      total += file.size
    }
    const [archiveOk, archiveMsg] = verifyFileSize(total + 128 * next.length + 1024, config)
    if (!archiveOk) {
      showModal("File too large", archiveMsg)
      resetFileInputs()
      return
    }
    onStateChange({
      ...state,
      editKind: "file",
      file: next[0],
      files: next,
      fromDirectory,
    })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    const dropped = e.dataTransfer?.files
    if (dropped?.length) {
      setFiles(Array.from(dropped), false)
    }
    setDragged(false)
    setEditDragged(false)
  }

  return (
    <Card aria-label="Pastebin editor panel" classNames={cardOverrides} {...rest}>
      <CardBody className={"relative"}>
        <input
          type="file"
          ref={fileInput}
          className="hidden"
          multiple
          aria-label="Select files"
          onChange={(e) => {
            const files = e.target.files
            if (files?.length) {
              setFiles(Array.from(files), false)
            }
          }}
        />
        <input
          type="file"
          ref={directoryInput}
          className="hidden"
          aria-label="Select folder"
          // @ts-expect-error webkitdirectory is a non-standard directory picker attribute
          webkitdirectory=""
          onChange={(e) => {
            const files = e.target.files
            if (files?.length) {
              setFiles(Array.from(files), true)
            }
          }}
        />
        <Tabs
          variant="underlined"
          classNames={{
            tabList: `gap-2 w-full py-0 border-divider mb-2 -ml-1`,
            cursor: tst,
            tab: `max-w-fit px-2 h-8 px-2`,
            panel: "pb-1",
          }}
          selectedKey={state.editKind}
          onSelectionChange={(k) => {
            onStateChange({ ...state, editKind: k as EditKind })
            if (k === "file") fileInput.current?.click()
          }}
        >
          {/*Possibly a bug of chrome, but Tab sometimes has a transient unexpected scrollbar when resizing*/}
          <Tab key={"edit"} title="Edit" className={"overflow-hidden"}>
            <div
              className="relative"
              onDrop={onDrop}
              onDragEnter={(e) => {
                e.preventDefault()
                setEditDragged(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setEditDragged(true)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setEditDragged(false)
                }
              }}
            >
              <CodeEditor
                content={state.editContent}
                setContent={(k) => onStateChange({ ...state, editContent: k })}
                lang={state.editHighlightLang}
                setLang={(lang) => onStateChange({ ...state, editHighlightLang: lang })}
                filename={state.editFilename}
                setFilename={(name) => onStateChange({ ...state, editFilename: name })}
                disabled={isPasteLoading}
                placeholder={isPasteLoading ? "Loading..." : "Edit your paste here"}
              />
              {isEditDragged && (
                <div
                  className={
                    `absolute inset-0 rounded-xl flex flex-col items-center justify-center ` +
                    `bg-primary-100 pointer-events-none ${tst}`
                  }
                  aria-hidden="true"
                >
                  <div className="text-2xl my-2 font-bold">Drop file here</div>
                  <p className="text-1xl text-foreground-500">Release to upload as file</p>
                </div>
              )}
            </div>
          </Tab>
          <Tab key="file" title="File">
            <div
              className={
                `w-full h-[20rem] rounded-xl flex flex-col items-center justify-center cursor-pointer relative ${tst}` +
                (isDragged ? " bg-primary-100" : " bg-primary-50")
              }
              role="button"
              aria-label="Select file"
              onDrop={onDrop}
              onDragEnter={() => setDragged(true)}
              onDragLeave={() => setDragged(false)}
              onDragOver={(e) => {
                e.preventDefault()
                setDragged(true)
              }}
              onClick={() => fileInput.current?.click()}
            >
              <div className="text-2xl my-2 font-bold px-4 text-center break-all">
                {selected.length === 0 ? "Select File" : zipping ? `${selected.length} files` : selected[0]?.name}
              </div>
              <p className={`text-1xl text-foreground-500 ${tst} relative`}>
                <span>
                  {selected.length === 0
                    ? "Click or drag & drop file here"
                    : `${formatSize(selectedBytes)}${zipping ? " · ZIP" : ""} · Click or drag to replace`}
                </span>
              </p>
              <div className={`mt-3 flex gap-3 text-sm text-primary ${tst}`}>
                <button
                  type="button"
                  className="underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInput.current?.click()
                  }}
                >
                  Select files
                </button>
                <button
                  type="button"
                  className="underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    directoryInput.current?.click()
                  }}
                >
                  Select folder
                </button>
              </div>
              {selected.length > 0 && (
                <XIcon
                  aria-label="Remove file"
                  role="button"
                  className={`h-6 inline absolute top-2 right-2 text-red-400 ${tst}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setFiles([], false)
                  }}
                />
              )}
            </div>
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  )
}
