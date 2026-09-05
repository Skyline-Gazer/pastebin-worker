const encoder = new TextEncoder()

function base64url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")
}

/** A stable, server-derived identifier; raw Feishu identifiers never leave this boundary. */
export async function derivePrincipalKey(
  key: string,
  appId: string,
  tenantKey: string,
  openId: string,
): Promise<string> {
  if (![key, appId, tenantKey, openId].every((value) => typeof value === "string" && value.length > 0))
    throw new Error("INVALID_PRINCIPAL_INPUT")
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  return `feishu:v1:principal:${base64url(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(JSON.stringify([appId, tenantKey, openId]))))}`
}
