import { DurableObject } from "cloudflare:workers"

export class PasteReadCounter extends DurableObject {
  async consume(maxReads: number): Promise<"ok" | "last" | "exhausted"> {
    if (!Number.isInteger(maxReads) || maxReads < 1) return "exhausted"
    const used = (await this.ctx.storage.get<number>("used")) ?? 0
    if (used >= maxReads) return "exhausted"
    const next = used + 1
    await this.ctx.storage.put("used", next)
    return next >= maxReads ? "last" : "ok"
  }
}

interface ReadCounterEnv {
  PASTE_READ_COUNTER: DurableObjectNamespace<PasteReadCounter>
}

export async function consumePasteRead(
  env: ReadCounterEnv,
  pasteName: string,
  readStateVersion: string,
  maxReads: number,
): Promise<"ok" | "last" | "exhausted"> {
  const ns = env.PASTE_READ_COUNTER
  const stub = ns.get(ns.idFromName(`${pasteName}:${readStateVersion}`))
  return await stub.consume(maxReads)
}
