import { atob_utf8, btoa_utf8, WorkerError } from "../common.js"
import { compareSync } from "bcrypt-ts"
import { argon2id } from "@noble/hashes/argon2.js"

// Encoding function
export function encodeBasicAuth(username: string, password: string): string {
  const credentials = `${username}:${password}`
  return `Basic ${btoa_utf8(credentials)}`
}

// Decoding function
export function decodeBasicAuth(encodedString: string): {
  username: string
  password: string
} {
  const [scheme, encodedCredentials] = encodedString.split(" ")
  if (scheme !== "Basic") {
    throw new WorkerError(400, "Invalid authentication scheme")
  }
  const credentials = atob_utf8(encodedCredentials)
  const [username, password] = credentials.split(":", 2)
  return { username, password }
}

// OWASP Argon2id recommendations (m in KiB). p=1 keeps Worker CPU bounded.
const ARGON2ID_T = 2
const ARGON2ID_M = 19456
const ARGON2ID_P = 1
const ARGON2ID_DK_LEN = 32
const ARGON2ID_MAXMEM = 64 * 1024 * 1024

function b64nopad(bytes: Uint8Array): string {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/=+$/, "")
}

function b64nopadDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4)
  const bin = atob(s + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

function encodeArgon2idPhc(salt: Uint8Array, hash: Uint8Array): string {
  return `$argon2id$v=19$m=${ARGON2ID_M},t=${ARGON2ID_T},p=${ARGON2ID_P}$${b64nopad(salt)}$${b64nopad(hash)}`
}

function decodeArgon2idPhc(
  stored: string,
): { m: number; t: number; p: number; salt: Uint8Array; hash: Uint8Array } | null {
  const match = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(stored)
  if (!match) return null
  const m = Number(match[1])
  const t = Number(match[2])
  const p = Number(match[3])
  if (!Number.isSafeInteger(m) || !Number.isSafeInteger(t) || !Number.isSafeInteger(p)) return null
  if (m < 8 || m > ARGON2ID_MAXMEM / 1024 || t < 1 || t > 8 || p !== 1) return null
  try {
    return { m, t, p, salt: b64nopadDecode(match[4]), hash: b64nopadDecode(match[5]) }
  } catch {
    return null
  }
}

export function hashBasicAuthPassword(password: string): string {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = argon2id(password, salt, {
    t: ARGON2ID_T,
    m: ARGON2ID_M,
    p: ARGON2ID_P,
    dkLen: ARGON2ID_DK_LEN,
    maxmem: ARGON2ID_MAXMEM,
  })
  return encodeArgon2idPhc(salt, hash)
}

export function verifyBasicAuthPassword(password: string, stored: string): boolean {
  if (stored.startsWith("$argon2id$")) {
    const parsed = decodeArgon2idPhc(stored)
    if (!parsed) return false
    try {
      const hash = argon2id(password, parsed.salt, {
        t: parsed.t,
        m: parsed.m,
        p: parsed.p,
        dkLen: parsed.hash.length,
        maxmem: ARGON2ID_MAXMEM,
      })
      if (hash.length !== parsed.hash.length) return false
      return crypto.subtle.timingSafeEqual(hash, parsed.hash)
    } catch {
      return false
    }
  }
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return compareSync(password, stored)
  }
  return false
}

// return null if auth passes or is not required,
// return auth page if auth is required
// throw WorkerError if auth failed
// TODO: only allow hashed passwd
export function verifyAuth(request: Request, env: Env): Response | null {
  // pass auth if 'BASIC_AUTH' is not present
  const basic_auth = env.BASIC_AUTH as Record<string, string>
  const auth_entries = Object.entries(basic_auth)

  const passwdMap = new Map<string, string>(auth_entries)

  // pass auth if 'BASIC_AUTH' is empty
  if (passwdMap.size === 0) return null

  if (request.headers.has("Authorization")) {
    const { username, password } = decodeBasicAuth(request.headers.get("Authorization")!)
    const stored = passwdMap.get(username)
    if (!stored || !verifyBasicAuthPassword(password, stored)) {
      throw new WorkerError(401, "incorrect passwd for basic auth")
    } else {
      return null
    }
  } else {
    return new Response("HTTP basic auth is required", {
      status: 401,
      headers: {
        // Prompts the user for credentials.
        "WWW-Authenticate": 'Basic charset="UTF-8"',
      },
    })
  }
}
