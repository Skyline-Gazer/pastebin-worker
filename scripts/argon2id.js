#!/usr/bin/env node

import { argon2id } from "@noble/hashes/argon2.js"
import readline from "readline"

const ARGON2ID_T = 2
const ARGON2ID_M = 19456
const ARGON2ID_P = 1
const ARGON2ID_DK_LEN = 32
const ARGON2ID_MAXMEM = 64 * 1024 * 1024

function b64nopad(bytes) {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/=+$/, "")
}

function hashBasicAuthPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = argon2id(password, salt, {
    t: ARGON2ID_T,
    m: ARGON2ID_M,
    p: ARGON2ID_P,
    dkLen: ARGON2ID_DK_LEN,
    maxmem: ARGON2ID_MAXMEM,
  })
  return `$argon2id$v=19$m=${ARGON2ID_M},t=${ARGON2ID_T},p=${ARGON2ID_P}$${b64nopad(salt)}$${b64nopad(hash)}`
}

function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: null,
    terminal: true,
  })

  process.stderr.write("Enter password: ")
  rl.question("", (password) => {
    rl.close()
    try {
      const hash = hashBasicAuthPassword(password)
      process.stdout.write("\n" + hash + "\n")
    } catch (err) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  })
}

main()
