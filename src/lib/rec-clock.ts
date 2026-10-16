/** One recording clock for the whole page: the hero's REC counter and the Work timeline share it. */
let startedAt = 0

export function recElapsed() {
  if (typeof performance === "undefined") return 0
  if (!startedAt) startedAt = performance.now()
  return performance.now() - startedAt
}

/** HH:MM:SS:FF at 24 fps. */
export function timecode(ms: number) {
  const f = Math.floor((Math.max(0, ms) / 1000) * 24)
  const pad = (n: number) => String(n).padStart(2, "0")
  const s = Math.floor(f / 24)
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f % 24)}`
}
