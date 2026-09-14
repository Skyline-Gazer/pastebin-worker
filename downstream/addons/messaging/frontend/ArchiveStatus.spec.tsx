import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ArchiveStatus } from "./ArchiveStatus"

describe("ArchiveStatus", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("formats a valid authoritative timed ISO with a compact accessible countdown", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"))

    render(<ArchiveStatus retentionMode="timed" expiresAt="2030-01-04T04:05:00.000Z" />)

    expect(screen.getByRole("status")).toHaveTextContent("限期归档：剩余 3d 4h 5m")
    expect(screen.getByRole("status")).toHaveAccessibleName("限期归档，剩余 3d 4h 5m")
  })

  it("shows a permanent archive without a timer", () => {
    render(<ArchiveStatus retentionMode="permanent" expiresAt={null} />)

    expect(screen.getByRole("status")).toHaveTextContent("永久归档")
    expect(screen.getByRole("status")).not.toHaveTextContent("剩余")
  })

  it("refreshes only at a coarse cadence and cleans up its timer", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"))
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval")
    const { unmount } = render(<ArchiveStatus retentionMode="timed" expiresAt="2030-01-01T00:02:00.000Z" />)

    expect(screen.getByRole("status")).toHaveTextContent("剩余 2m")
    await act(() => vi.advanceTimersByTime(59_000))
    expect(screen.getByRole("status")).toHaveTextContent("剩余 2m")
    await act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByRole("status")).toHaveTextContent("剩余 1m")
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it("keeps elapsed and invalid timestamps as non-negative stale archive statuses", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"))
    const { rerender } = render(<ArchiveStatus retentionMode="timed" expiresAt="2029-12-31T23:59:00.000Z" />)

    expect(screen.getByRole("status")).toHaveTextContent("限期归档：等待确认过期状态")
    expect(screen.getByRole("status")).not.toHaveTextContent("-")
    rerender(<ArchiveStatus retentionMode="timed" expiresAt="not-an-iso-timestamp" />)
    expect(screen.getByRole("status")).toHaveTextContent("限期归档：等待确认过期状态")
  })

  it("does not fetch when its display timer advances", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"))
    const fetchMock = vi.spyOn(globalThis, "fetch")
    render(<ArchiveStatus retentionMode="timed" expiresAt="2030-01-01T00:03:00.000Z" />)

    await act(() => vi.advanceTimersByTime(120_000))
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockRestore()
  })
})
