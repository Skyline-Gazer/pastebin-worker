import { Card, CardBody, CardHeader } from "./ui/index.js"
import { cardOverrides, tst } from "../utils/overrides.js"
import { pasteLabel, type LocalUpload } from "../utils/localUploads.js"

interface RecentUploadsPanelProps {
  uploads: LocalUpload[]
  onSelect: (manageUrl: string) => void
  className?: string
}

export function RecentUploadsPanel({ uploads, onSelect, className = "" }: RecentUploadsPanelProps) {
  if (uploads.length === 0) return null

  return (
    <Card className={`w-full ${className}`} classNames={cardOverrides}>
      <CardHeader>
        <h2 className="text-lg font-medium">Recent uploads</h2>
      </CardHeader>
      <CardBody className="pt-0">
        <p className={`text-small text-default-500 mb-3 ${tst}`}>
          Manage URLs are stored on this device only and are not synced. Anyone with this browser profile can update or
          delete those pastes.
        </p>
        <ul className="flex flex-col gap-1">
          {uploads.map((item) => (
            <li key={item.manageUrl}>
              <button
                type="button"
                className={`w-full text-left px-2 py-1.5 rounded-lg hover:bg-default-100 ${tst}`}
                onClick={() => onSelect(item.manageUrl)}
              >
                {pasteLabel(item.url)}
              </button>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}
