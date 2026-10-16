"use client"

import { useEffect, useRef, useState } from "react"
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from "framer-motion"
import { Volume2, VolumeX } from "lucide-react"
import { BANKS, CLIENT_CLIPS, posterOf, previewOf, type ClientClip } from "@/data/clients"
import { timecode } from "@/lib/rec-clock"

const byId = (id: string) => CLIENT_CLIPS.find((c) => c.id === id)!
const label = (c: ClientClip) => `${c.bank}${CLIENT_CLIPS.filter((x) => x.bank === c.bank).indexOf(c) + 1}`
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`

/**
 * Client work as a live vision mixer. Every project loops silently on the multiviewer wall.
 * Hover a monitor to load it into Preview (green tally); click to cut it to Program (red tally),
 * or pull the T-bar to crossfade picture and sound by hand. The visitor directs the show.
 */
export function ControlRoom() {
  const section = useRef<HTMLElement>(null)
  const [live, setLive] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [pgm, setPgm] = useState("ryeez3qpqj")
  const [pvw, setPvw] = useState("fd4u5bva5i")
  const [audio, setAudio] = useState(false)
  // Two program slots, so a transition can blend the incoming source over the outgoing one.
  const [slots, setSlots] = useState<[string, string]>(["ryeez3qpqj", "fd4u5bva5i"])
  const [front, setFront] = useState<0 | 1>(0)
  const videos = useRef<(HTMLVideoElement | null)[]>([null, null])
  const progress = useRef<HTMLDivElement>(null)
  const tcRef = useRef<HTMLSpanElement>(null)
  const busy = useRef(false)

  // T-bar: lever position 0..1; the transition amount is the distance from where it rested.
  const lever = useMotionValue(0)
  const rest = useRef(0)
  const mix = useMotionValue(0)
  useMotionValueEvent(lever, "change", (v) => mix.set(Math.abs(v - rest.current)))

  useEffect(() => {
    const el = section.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { rootMargin: "200px" })
    io.observe(el)
    const m = () => setNarrow(window.innerWidth < 768)
    m()
    window.addEventListener("resize", m)
    return () => {
      io.disconnect()
      window.removeEventListener("resize", m)
    }
  }, [])

  // Desktop: everything fits one screen. The wall gets a band of fixed height; the monitors get
  // whatever is left, sized from both width and height so they never overflow.
  const stage = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ pgm: 0, pvw: 0, a: 0, b: 0 })
  useEffect(() => {
    const el = stage.current
    const sec = section.current
    if (!el || !sec) return
    const measure = () => {
      const W = el.clientWidth
      const H = el.clientHeight
      const gap = 8
      const wallH = Math.min(250, Math.max(170, window.innerHeight * 0.26)) - 22
      let a = (((wallH - gap) / 2) * 16) / 9
      let b = (wallH * 9) / 16
      const fixed = 3 * gap + 20 + 5 * gap
      const need = 4 * a + 6 * b + fixed
      if (need > W) {
        const k = (W - fixed) / (need - fixed)
        a *= k
        b *= k
      }
      const pgmByW = (W - 76 - 40) / 1.62
      const pgmByH = (H - 34) * (16 / 9)
      const pgm = Math.max(240, Math.min(pgmByW, pgmByH))
      setFit({ pgm: Math.floor(pgm), pvw: Math.floor(pgm * 0.62), a: Math.floor(a), b: Math.floor(b) })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    ro.observe(sec)
    return () => ro.disconnect()
  }, [])

  // Keep program playing only while the section is on screen.
  useEffect(() => {
    const v = videos.current[front]
    if (!v) return
    if (live) v.play().catch(() => {})
    else v.pause()
  }, [live, front, slots])

  // Audio follows the mix: outgoing fades down as incoming fades up.
  useMotionValueEvent(mix, "change", (m) => {
    const out = videos.current[front]
    const inc = videos.current[1 - front]
    if (out) out.volume = audio ? 1 - m : 0
    if (inc) inc.volume = audio ? m : 0
  })

  // Program timecode + progress bar from the on-air video.
  useEffect(() => {
    let id = 0
    const tick = () => {
      const v = videos.current[front]
      if (v && v.duration) {
        if (progress.current) progress.current.style.transform = `scaleX(${v.currentTime / v.duration})`
        if (tcRef.current) tcRef.current.textContent = timecode(v.currentTime * 1000)
      }
      id = requestAnimationFrame(tick)
    }
    if (live) id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [live, front])

  const turnOnAudio = () => {
    setAudio(true)
    for (const v of videos.current) if (v) v.muted = false
  }

  // Load the preview source into the off-air slot and start it from the top, muted for now.
  const arm = (id: string) => {
    const back = (1 - front) as 0 | 1
    setSlots((s) => {
      const next: [string, string] = [...s] as [string, string]
      next[back] = id
      return next
    })
    requestAnimationFrame(() => {
      const v = videos.current[back]
      if (v) {
        v.currentTime = 0
        v.volume = 0
        v.play().catch(() => {})
      }
    })
  }

  const commit = (incoming: string) => {
    const old = pgm
    const outgoing = videos.current[front]
    setFront((f) => (1 - f) as 0 | 1)
    setPgm(incoming)
    setPvw(old)
    outgoing?.pause()
    const inc = videos.current[1 - front]
    if (inc) inc.volume = audio ? 1 : 0
    mix.set(0) // the incoming slot is now the front one
    busy.current = false
  }

  // CUT: straight switch, the way most of an edit is built.
  const cut = (id = pvw) => {
    if (busy.current || id === pgm) return
    turnOnAudio()
    arm(id)
    lever.set(rest.current)
    requestAnimationFrame(() => commit(id))
  }

  // AUTO: the switcher performs a one-second mix for you.
  const auto = () => {
    if (busy.current || pvw === pgm) return
    busy.current = true
    turnOnAudio()
    arm(pvw)
    const target = rest.current === 0 ? 1 : 0
    animate(lever, target, {
      duration: 1,
      ease: "easeInOut",
      onComplete: () => {
        rest.current = target
        lever.set(target) // mix back to 0 relative to the new rest
        commit(pvw)
      },
    })
  }

  // Manual T-bar.
  const track = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const onLever = (clientY: number) => {
    const r = track.current!.getBoundingClientRect()
    lever.set(Math.min(1, Math.max(0, (clientY - r.top) / r.height)))
  }
  const release = () => {
    if (!dragging.current) return
    dragging.current = false
    const m = mix.get()
    const target = m > 0.5 ? (rest.current === 0 ? 1 : 0) : rest.current
    animate(lever, target, {
      duration: 0.35,
      ease: "easeOut",
      onComplete: () => {
        if (target !== rest.current) {
          rest.current = target
          lever.set(target)
          commit(pvw)
        }
      },
    })
  }
  const leverY = useTransform(lever, (v) => `${v * 100}%`)

  const pgmClip = byId(pgm)
  const pvwClip = byId(pvw)

  return (
    <section ref={section} id="clients" aria-label="Client work" className="relative flex flex-col border-t border-white/5 bg-storm-950 px-4 pb-10 pt-[88px] md:h-svh md:min-h-[680px] md:px-8 md:pb-6 md:pt-[100px]">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-sun">03 · Client work</p>
          <h2 className="mt-1 font-display text-[clamp(38px,5vw,72px)] uppercase leading-[0.9] text-paper">Control room</h2>
        </div>
        <div className="flex items-center gap-4 font-mono uppercase">
          <span
            className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-[10px] tracking-[0.24em] transition-colors ${
              audio ? "border-[#ff4b3e]/60 bg-[#ff4b3e]/15 text-[#ff8a80]" : "border-white/10 text-storm-400"
            }`}
          >
            <span className={`size-1.5 rounded-full ${audio ? "bg-[#ff4b3e] shadow-[0_0_8px_#ff4b3e]" : "bg-storm-600"}`} /> On air
          </span>
          <span ref={tcRef} className="hidden text-[clamp(16px,1.8vw,26px)] tabular-nums tracking-wider text-paper sm:block">
            00:00:00:00
          </span>
        </div>
      </div>

      {/* Switcher: preview · controls · program */}
      <div ref={stage} className="mt-5 flex min-h-0 flex-col gap-4 md:flex-1 md:flex-row md:items-end md:justify-center md:gap-5">
        {!narrow && (
          <Monitor tally="pvw" label="PVW" clip={pvwClip} width={fit.pvw}>
            <PreviewVideo key={pvwClip.id} clip={pvwClip} live={live} />
          </Monitor>
        )}

        {!narrow && (
          <div className="flex w-[76px] shrink-0 flex-col items-center justify-end gap-2.5 pb-9">
            <button
              type="button"
              onClick={() => cut()}
              className="w-full rounded-md border border-white/15 bg-storm-800 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper transition-colors hover:border-[#ff4b3e] hover:bg-[#ff4b3e]/20"
            >
              Cut
            </button>
            <button
              type="button"
              onClick={auto}
              className="w-full rounded-md border border-white/15 bg-storm-800 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper transition-colors hover:border-sun hover:bg-sun/15"
            >
              Auto
            </button>
            {/* T-bar */}
            <div
              ref={track}
              role="slider"
              tabIndex={0}
              aria-label="T-bar: drag to mix preview into program"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(mix.get() * 100)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault()
                  auto()
                }
              }}
              onPointerDown={(e) => {
                if (busy.current || pvw === pgm) return
                dragging.current = true
                ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                turnOnAudio()
                arm(pvw)
                onLever(e.clientY)
              }}
              onPointerMove={(e) => dragging.current && onLever(e.clientY)}
              onPointerUp={release}
              onPointerCancel={release}
              className="relative mt-1 h-[clamp(110px,16vh,170px)] w-9 cursor-grab touch-none rounded-full border border-white/10 bg-storm-900 active:cursor-grabbing"
            >
              <span className="absolute inset-x-[17px] inset-y-3 rounded-full bg-black/60" />
              <motion.span className="absolute inset-x-0 h-0 top-3 bottom-3" style={{ top: leverY }}>
                <span className="absolute left-1/2 top-0 h-3.5 w-12 -translate-x-1/2 rounded-sm bg-gradient-to-b from-paper to-storm-200 shadow-[0_6px_14px_-4px_rgb(0_0_0/0.8)]" />
              </motion.span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-storm-400">T-bar</span>
          </div>
        )}

        <Monitor tally="pgm" label="PGM" clip={pgmClip} big width={narrow ? undefined : fit.pgm}>
          {slots.map((id, i) => {
            const c = byId(id)
            return (
              <motion.div key={i} className="absolute inset-0" style={{ opacity: i === front ? 1 : mix, zIndex: i === front ? 1 : 2 }}>
                {c.aspect !== "16:9" && <img src={posterOf(c)} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-2xl" />}
                <video
                  ref={(el) => {
                    videos.current[i] = el
                  }}
                  src={live || i === front ? c.src : undefined}
                  poster={posterOf(c)}
                  muted={!audio}
                  playsInline
                  loop
                  preload={i === front ? "auto" : "metadata"}
                  className="absolute inset-0 size-full object-contain"
                />
              </motion.div>
            )
          })}
          <div className="absolute inset-x-0 bottom-0 z-10 h-[3px] bg-white/10">
            <div ref={progress} className="h-full origin-left bg-[#ff4b3e]" style={{ transform: "scaleX(0)" }} />
          </div>
          <button
            type="button"
            onClick={() => (audio ? setAudio(false) : turnOnAudio())}
            aria-label={audio ? "Mute program" : "Unmute program"}
            className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-black/60 text-paper transition-colors hover:bg-black/80"
          >
            {audio ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          {!audio && (
            <span className="pointer-events-none absolute bottom-14 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/85">
              {narrow ? "Tap a monitor to cut it to program" : "Click a monitor to cut · pull the T-bar to mix"}
            </span>
          )}
        </Monitor>
      </div>

      {/* Multiviewer wall */}
      <div className={`mt-5 shrink-0 ${narrow ? "space-y-4" : "flex items-end justify-center gap-5"}`}>
        {BANKS.filter((b) => b.key !== "C").map((bank) => {
          const clips = CLIENT_CLIPS.filter((c) => c.bank === bank.key || (bank.key === "A" && c.bank === "C"))
          const vertical = bank.key === "B"
          return (
            <div key={bank.key}>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-storm-400">
                {bank.key === "A" ? "A · Brand films  /  C · Motion" : `${bank.key} · ${bank.label}`}
              </p>
              <div
                className={
                  narrow
                    ? "-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
                    : vertical
                      ? "grid grid-cols-6 gap-2"
                      : "grid grid-cols-4 gap-2"
                }
              >
                {clips.map((c) => (
                  <Tile
                    key={c.id}
                    clip={c}
                    live={live}
                    narrow={narrow}
                    width={narrow ? undefined : vertical ? fit.b : fit.a}
                    state={c.id === pgm ? "pgm" : c.id === pvw ? "pvw" : null}
                    onPreview={() => !busy.current && c.id !== pgm && setPvw(c.id)}
                    onCut={() => {
                      setPvw(c.id)
                      cut(c.id)
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Monitor({
  tally,
  label,
  clip,
  big,
  width,
  children,
}: {
  tally: "pgm" | "pvw"
  label: string
  clip: ClientClip
  big?: boolean
  width?: number
  children: React.ReactNode
}) {
  const color = tally === "pgm" ? "#ff4b3e" : "#3ddc84"
  return (
    <div className="min-w-0 shrink-0" style={width ? { width } : undefined}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black" style={{ boxShadow: `0 0 0 2px ${color}, 0 0 24px -6px ${color}` }}>
        {children}
        <span
          className="pointer-events-none absolute left-3 top-3 z-10 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.2em] text-black"
          style={{ background: color }}
        >
          {label}
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className={`truncate font-medium text-paper ${big ? "text-[15px] md:text-[17px]" : "text-[13px]"}`}>{clip.title}</p>
        <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-storm-400">
          {label === "PGM" && clip.client ? `${clip.client} · ` : ""}
          {clip.credit && big ? `${clip.credit} · ` : ""}
          {clip.aspect} · {fmt(clip.duration)}
        </p>
      </div>
    </div>
  )
}

function PreviewVideo({ clip, live }: { clip: ClientClip; live: boolean }) {
  return (
    <>
      {clip.aspect !== "16:9" && <img src={posterOf(clip)} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-2xl" />}
      <video
        src={live ? previewOf(clip) : undefined}
        poster={posterOf(clip)}
        muted
        loop
        autoPlay
        playsInline
        className="absolute inset-0 size-full object-contain"
      />
    </>
  )
}

function Tile({
  clip,
  live,
  narrow,
  width,
  state,
  onPreview,
  onCut,
}: {
  clip: ClientClip
  live: boolean
  narrow: boolean
  width?: number
  state: "pgm" | "pvw" | null
  onPreview: () => void
  onCut: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (live) v.play().catch(() => {})
    else v.pause()
  }, [live])
  const ring = state === "pgm" ? "#ff4b3e" : state === "pvw" ? "#3ddc84" : "rgb(255 255 255 / 0.12)"
  const vertical = clip.aspect === "9:16"
  return (
    <button
      type="button"
      onPointerEnter={(e) => e.pointerType === "mouse" && onPreview()}
      onFocus={onPreview}
      onClick={onCut}
      aria-label={`Cut ${clip.title} to program`}
      className={`group relative shrink-0 snap-start overflow-hidden rounded-lg bg-black text-left transition-transform duration-300 hover:-translate-y-0.5 ${
        vertical ? "aspect-[9/16]" : "aspect-video"
      } ${narrow ? (vertical ? "w-[96px]" : "w-[200px]") : ""}`}
      style={{ boxShadow: `0 0 0 ${state ? 2 : 1}px ${ring}`, width }}
    >
      {clip.aspect === "4:3" && <img src={posterOf(clip)} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-xl" />}
      <video
        ref={ref}
        src={live ? previewOf(clip) : undefined}
        poster={posterOf(clip)}
        muted
        loop
        playsInline
        preload="none"
        className={`absolute inset-0 size-full ${clip.aspect === "4:3" ? "object-contain" : "object-cover"}`}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
      <span className="absolute left-1.5 top-1.5 flex items-center gap-1 font-mono text-[9px] font-semibold tracking-[0.15em] text-paper">
        <span className="rounded bg-black/60 px-1 py-px">{label(clip)}</span>
        {state && (
          <span className="rounded px-1 py-px text-black" style={{ background: ring }}>
            {state.toUpperCase()}
          </span>
        )}
      </span>
      <span className={`absolute inset-x-1.5 bottom-1 font-medium leading-tight text-paper ${vertical ? "line-clamp-3 text-[10px]" : "truncate text-[11px]"}`}>
        {clip.title}
      </span>
    </button>
  )
}
