export const CHAR_GEN = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678"
export const NAME_REGEX = /^[a-zA-Z0-9+_\-[\]*$@,;]{3,}$/
export const PASTE_NAME_LEN = 4
export const PRIVATE_PASTE_NAME_LEN = 24
export const DEFAULT_PASSWD_LEN = 24
export const MAX_PASSWD_LEN = 128
export const MIN_PASSWD_LEN = 8
export const MAX_URL_REDIRECT_LEN = 2000
export const PASSWD_SEP = ":"
export const MAX_AUTO_FETCH_BYTES = 256 * 1024
export const MPU_PASSWORD_HEADER = "X-PB-Password"
export const MPU_KEY_HEADER = "X-PB-MPU-Key"
export const MPU_UPLOAD_ID_HEADER = "X-PB-MPU-Upload-Id"
export const DEFAULT_EDIT_FILENAME = "Untitled"
export const MAX_READS_CAP = 1000

export function normalizePasteFilename(filename: string | undefined): string {
  return filename?.trim() ? filename : DEFAULT_EDIT_FILENAME
}
