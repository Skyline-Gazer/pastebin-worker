import { describe, expect, it, vi } from "vitest"
import { createRestoreStageEmitter, reportRestoreStage } from "../worker/restore-telemetry"

describe("restore ordering telemetry", () => {
  it("emits monotonic seq with stable request_id and op_id correlation", () => {
    const logs: string[] = []
    const log = vi.spyOn(console, "log").mockImplementation((message: unknown) => {
      logs.push(String(message))
    })
    const stages = createRestoreStageEmitter("restore-req-1")
    stages.setKind("restore_permanent")
    stages.emit("request_accepted")
    stages.emit("reservation_completed")
    stages.setOpId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee")
    stages.emit("dispatch_completed")
    stages.emit("upstream_update_started")
    stages.emit("upstream_update_completed")
    stages.emit("finish_completed")
    expect(logs).toEqual([
      "RESTORE_STAGE=request_accepted seq=1 request_id=restore-req-1 kind=restore_permanent",
      "RESTORE_STAGE=reservation_completed seq=2 request_id=restore-req-1 kind=restore_permanent",
      "RESTORE_STAGE=dispatch_completed seq=3 request_id=restore-req-1 op_id=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee kind=restore_permanent",
      "RESTORE_STAGE=upstream_update_started seq=4 request_id=restore-req-1 op_id=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee kind=restore_permanent",
      "RESTORE_STAGE=upstream_update_completed seq=5 request_id=restore-req-1 op_id=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee kind=restore_permanent",
      "RESTORE_STAGE=finish_completed seq=6 request_id=restore-req-1 op_id=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee kind=restore_permanent",
    ])
    const reserveSeq = Number(/seq=(\d+)/.exec(logs[1])![1])
    const updateSeq = Number(/seq=(\d+)/.exec(logs[3])![1])
    expect(reserveSeq).toBeLessThan(updateSeq)
    log.mockRestore()
  })

  it("does not emit secret-bearing fields even when passed unsafe values", () => {
    const logs: string[] = []
    const log = vi.spyOn(console, "log").mockImplementation((message: unknown) => {
      logs.push(String(message))
    })
    reportRestoreStage({
      stage: "upstream_update_failed",
      seq: 1,
      requestId: "password=super-secret-token",
      opId: "not-a-uuid",
      code: "UPSTREAM_REJECTED",
    })
    expect(logs).toEqual(["RESTORE_STAGE=upstream_update_failed seq=1 code=UPSTREAM_REJECTED"])
    expect(logs.join("\n")).not.toContain("super-secret")
    expect(logs.join("\n")).not.toContain("password=")
    log.mockRestore()
  })
})
