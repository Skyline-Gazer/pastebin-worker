import { MAX_PASSWD_LEN, MAX_READS_CAP, MIN_PASSWD_LEN, NAME_REGEX } from "./constants.js"
import { parseExpirationReadable, parseExpirationSpec } from "./parsers.js"

export type VerifyResult = [ok: true, message: string] | [ok: false, error: string]

export function isLegalUrl(url: string): boolean {
  return URL.canParse(url)
}

export function isLegalRedirectUrl(url: string): boolean {
  const trimmedUrl = url.trim()
  if (!/^https?:\/\//i.test(trimmedUrl) || !URL.canParse(trimmedUrl)) {
    return false
  }

  const parsedUrl = new URL(trimmedUrl)
  const authority = trimmedUrl.slice(trimmedUrl.indexOf("://") + 3).split(/[/?#]/, 1)[0]
  return (
    (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") &&
    parsedUrl.username === "" &&
    parsedUrl.password === "" &&
    !authority.includes("@")
  )
}

export function verifyPassword(password: string): VerifyResult {
  if (password === "") {
    return [true, ""]
  } else if (password.length < MIN_PASSWD_LEN) {
    return [false, `Password too short (${password.length} < ${MIN_PASSWD_LEN})`]
  } else if (password.length > MAX_PASSWD_LEN) {
    return [false, `Password too long (${password.length} > ${MAX_PASSWD_LEN})`]
  } else if (password.includes("\n")) {
    return [false, "Password should not contain newlines"]
  }
  return [true, ""]
}

export function verifyName(name: string): VerifyResult {
  if (name.length < 3) {
    return [false, "Name should have at least 3 characters"]
  } else if (!NAME_REGEX.test(name)) {
    return [false, `Name ${name} not satisfying regexp ${NAME_REGEX}`]
  }
  return [true, ""]
}

export function verifyExpiration(expiration: string, maxExpirationSeconds: number): VerifyResult {
  const parsed = parseExpirationSpec(expiration)
  if (parsed === null) {
    return [false, `‘${expiration}’ is not a valid expiration specification`]
  }
  if (parsed.kind === "never") return [true, "Never expires"]
  if (parsed.kind === "max") return [true, "Expires in maximum allowed duration"]
  if (parsed.seconds > maxExpirationSeconds) {
    return [false, `Exceed max expiration (${parseExpirationReadable(`${maxExpirationSeconds}s`)!})`]
  }
  return [true, `Expires in ${parseExpirationReadable(expiration)!}`]
}

export function parseMaxReads(raw: string | undefined): number | undefined | null {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  if (trimmed === "") return undefined
  if (!/^[1-9]\d*$/.test(trimmed)) return null
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < 1 || n > MAX_READS_CAP) return null
  return n
}

export function verifyMaxReads(raw: string): VerifyResult {
  const parsed = parseMaxReads(raw)
  if (parsed === null) {
    return [false, `Max reads must be an integer from 1 to ${MAX_READS_CAP}`]
  }
  if (parsed === undefined) {
    return [true, "Unlimited reads"]
  }
  return [true, `${parsed} read${parsed === 1 ? "" : "s"}`]
}
