const encoder = new TextEncoder()

function hex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, "0")).join("")
}

function bytes(value: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error("INVALID_SECRET_CONFIG")
  return Uint8Array.from(value.match(/../g)!, (pair) => parseInt(pair, 16))
}

export class Credentials {
  private constructor(
    private readonly keyId: string,
    private readonly encryptionKey: CryptoKey,
    private readonly fingerprintKey: CryptoKey,
  ) {}

  static async create(keyId: string, encryptionHex: string, fingerprintHex: string): Promise<Credentials> {
    if (!/^[a-zA-Z0-9_-]+$/.test(keyId) || encryptionHex.length !== 64 || fingerprintHex.length !== 64)
      throw new Error("INVALID_SECRET_CONFIG")
    if (encryptionHex.toLowerCase() === fingerprintHex.toLowerCase()) throw new Error("SEPARATE_KEYS_REQUIRED")
    const encryptionKey = await crypto.subtle.importKey("raw", bytes(encryptionHex), "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ])
    const fingerprintKey = await crypto.subtle.importKey(
      "raw",
      bytes(fingerprintHex),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    return new Credentials(keyId, encryptionKey, fingerprintKey)
  }

  generate(): string {
    return hex(crypto.getRandomValues(new Uint8Array(32)))
  }

  async seal(bindingId: string, password: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: encoder.encode(bindingId) },
      this.encryptionKey,
      encoder.encode(password),
    )
    return `${this.keyId}.${hex(iv)}.${hex(encrypted)}`
  }

  async open(bindingId: string, envelope: string): Promise<string> {
    const [keyId, iv, ciphertext, extra] = envelope.split(".")
    if (keyId !== this.keyId || iv?.length !== 24 || !ciphertext || extra !== undefined)
      throw new Error("INVALID_CREDENTIAL")
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes(iv), additionalData: encoder.encode(bindingId) },
      this.encryptionKey,
      bytes(ciphertext),
    )
    return new TextDecoder().decode(decrypted)
  }

  async fingerprint(value: string): Promise<string> {
    return hex(await crypto.subtle.sign("HMAC", this.fingerprintKey, encoder.encode(value)))
  }
}
