"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from "lucide-react"
import { LONG_FORM, REELS, posterOf, previewOf, type ClientClip } from "@/data/clients"

type Side = "long" | "reel"
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

/**
 * Client work as two players: long-form brand films on the left, reels on the right, each with its
 * own row of projects. Only one plays at a time: starting either one pauses the other.
 * The long-form player starts silently when the section arrives; any click turns sound on.
 */
export function ClientWork() {
  const section = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [longId, setLongId] = useState(LONG_FORM[0].id)
  const [reelId, setReelId] = useState(REELS[0].id)
  const [playing, setPlaying] = useState<Side | null>(null)
  const [sound, setSound] = useState(false)
  const [p, setP] = useState(0) // player height (desktop)
  const videos = useRef<Record<Side, HTMLVideoElement | null>>({ long: null, reel: null })
  const userActed = useRef(false)
  const pendingPlay = useRef<Side | null>(null)

  useEffect(() => {
    const el = section.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Desktop: size both players from the space available so the section fits one screen.
  useEffect(() => {
    const el = body.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const phone = window.innerWidth < 768
      setNarrow(phone)
      if (phone) return
      const W = el.clientWidth
      const H = el.clientHeight
      const byW = (W - 32) / (16 / 9 + 9 / 16)
      const byH = H - 56 - 104 - 24 // caption + rail + gaps
      setP(Math.floor(Math.max(220, Math.min(byW, byH))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Arriving: the long-form film starts silently. Leaving: everything pauses.
  useEffect(() => {
    const v = videos.current
    if (!live) {
      v.long?.pause()
      v.reel?.pause()
      return
    }
    if (!userActed.current) v.long?.play().catch(() => {})
  }, [live])

  // Only one at a time.
  const onPlayed = (side: Side) => {
    setPlaying(side)
    const other = videos.current[side === "long" ? "reel" : "long"]
    if (other && !other.paused) other.pause()
  }

  const start = (side: Side) => {
    userActed.current = true
    setSound(true)
    const v = videos.current[side]
    if (!v) return
    v.muted = false
    v.play().catch(() => {})
  }

  const toggle = (side: Side) => {
    const v = videos.current[side]
    if (!v) return
    if (v.paused || (v.muted && !userActed.current)) start(side)
    else v.pause()
  }

  // Picking a project loads it into its player and plays it (with sound).
  const pick = (side: Side, id: string) => {
    userActed.current = true
    setSound(true)
    pendingPlay.current = side
    if (side === "long") {
      if (id === longId) return start("long")
      setLongId(id)
    } else {
      if (id === reelId) return start("reel")
      setReelId(id)
    }
  }

  const next = (side: Side) => {
    const list = side === "long" ? LONG_FORM : REELS
    const cur = side === "long" ? longId : reelId
    const n = list[(list.findIndex((c) => c.id === cur) + 1) % list.length]
    pick(side, n.id)
  }

  const longClip = LONG_FORM.find((c) => c.id === longId)!
  const reelClip = REELS.find((c) => c.id === reelId)!

  const player = (side: Side, clip: ClientClip, list: ClientClip[], width: number | undefined, height: number | undefined) => (
    <Player
      side={side}
      clip={clip}
      index={list.indexOf(clip)}
      count={list.length}
      width={width}
      height={height}
      playing={playing === side}
      sound={sound}
      live={live}
      setRef={(el) => {
        videos.current[side] = el
      }}
      onPlayed={() => onPlayed(side)}
      onPaused={() => setPlaying((s) => (s === side ? null : s))}
      onEnded={() => next(side)}
      onLoaded={() => {
        if (pendingPlay.current === side) {
          pendingPlay.current = null
          start(side)
        }
      }}
      onToggle={() => toggle(side)}
      onMute={() => {
        const v = videos.current[side]
        if (!v) return
        if (v.muted || !sound) start(side)
        else {
          v.muted = true
          setSound(false)
        }
      }}
    />
  )

  const longW = narrow ? undefined : Math.round((p * 16) / 9)
  const reelW = narrow ? undefined : Math.round((p * 9) / 16)

  return (
    <section
      ref={section}
      id="clients"
      aria-label="Client work"
      className="relative flex flex-col border-t border-white/5 bg-storm-950 px-4 pb-12 pt-[88px] md:h-svh md:min-h-[700px] md:px-8 md:pb-6 md:pt-[100px]"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-sun">03 · Client work</p>
          <h2 className="mt-1 font-display text-[clamp(38px,5vw,72px)] uppercase leading-[0.9] text-paper">Commissioned</h2>
        </div>
        <p className="hidden max-w-[260px] text-right text-[13px] leading-snug text-storm-400 md:block">
          Brand films on the left, reels on the right. One plays at a time.
        </p>
      </div>

      <div ref={body} className={`mt-5 min-h-0 flex-1 ${narrow ? "space-y-10" : "flex items-start justify-center gap-8"}`}>
        {(narrow || p > 0) && (
          <>
            <div style={{ width: longW }} className="min-w-0">
              <ColumnLabel title="Long-form" count={LONG_FORM.length} live={playing === "long"} />
              {player("long", longClip, LONG_FORM, longW, narrow ? undefined : p)}
              <Rail side="long" list={LONG_FORM} activeId={longId} playing={playing === "long"} live={live} onPick={(id) => pick("long", id)} />
            </div>
            <div style={{ width: narrow ? undefined : Math.max(reelW ?? 0, 300) }} className="min-w-0">
              <ColumnLabel title="Reels" count={REELS.length} live={playing === "reel"} />
              <div className="flex justify-center">{player("reel", reelClip, REELS, reelW, narrow ? undefined : p)}</div>
              <Rail side="reel" list={REELS} activeId={reelId} playing={playing === "reel"} live={live} onPick={(id) => pick("reel", id)} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function ColumnLabel({ title, count, live }: { title: string; count: number; live: boolean }) {
  return (
    <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-storm-400">
      <span className={`size-1.5 rounded-full transition-colors ${live ? "bg-[#ff4b3e] shadow-[0_0_8px_#ff4b3e]" : "bg-storm-600"}`} />
      {title} · {String(count).padStart(2, "0")}
    </p>
  )
}

function Player({
  side,
  clip,
  index,
  count,
  width,
  height,
  playing,
  sound,
  live,
  setRef,
  onPlayed,
  onPaused,
  onEnded,
  onLoaded,
  onToggle,
  onMute,
}: {
  side: Side
  clip: ClientClip
  index: number
  count: number
  width?: number
  height?: number
  playing: boolean
  sound: boolean
  live: boolean
  setRef: (el: HTMLVideoElement | null) => void
  onPlayed: () => void
  onPaused: () => void
  onEnded: () => void
  onLoaded: () => void
  onToggle: () => void
  onMute: () => void
}) {
  const local = useRef<HTMLVideoElement | null>(null)
  const bar = useRef<HTMLDivElement>(null)
  const time = useRef<HTMLSpanElement>(null)
  const [muted, setMuted] = useState(true)
  const reel = side === "reel"

  // Progress + time, straight to the DOM.
  useEffect(() => {
    let id = 0
    const tick = () => {
      const v = local.current
      if (v && v.duration) {
        if (bar.current) bar.current.style.transform = `scaleX(${v.currentTime / v.duration})`
        if (time.current) time.current.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`
      }
      id = requestAnimationFrame(tick)
    }
    if (live) id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [live])

  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const v = local.current
    if (!v || !v.duration) return
    const r = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - r.left) / r.width) * v.duration
  }

  const fill = clip.aspect !== (reel ? "9:16" : "16:9")

  return (
    <div style={{ width }} className={reel ? "w-[min(100%,330px)] md:w-auto" : "w-full"}>
      <div
        className={`group relative overflow-hidden rounded-2xl bg-black transition-shadow duration-500 ${
          reel ? "aspect-[9/16]" : "aspect-video"
        } ${playing ? "shadow-[0_0_0_2px_#ff4b3e,0_0_32px_-8px_#ff4b3e]" : "shadow-[0_0_0_1px_rgb(255_255_255/0.12)]"}`}
        style={height ? { height } : undefined}
      >
        {fill && <img key={clip.id} src={posterOf(clip)} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-45 blur-2xl" />}
        <video
          ref={(el) => {
            local.current = el
            setRef(el)
          }}
          src={live || playing ? clip.src : undefined}
          poster={posterOf(clip)}
          muted={!sound}
          playsInline
          preload="metadata"
          onPlay={onPlayed}
          onPause={onPaused}
          onEnded={onEnded}
          onLoadedData={onLoaded}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onClick={onToggle}
          className={`absolute inset-0 size-full cursor-pointer ${fill ? "object-contain" : "object-cover"}`}
        />

        {/* Big play button while paused (or still silent) */}
        <AnimatePresence>
          {(!playing || (muted && !sound)) && (
            <motion.button
              type="button"
              onClick={onToggle}
              aria-label={`Play ${clip.title}`}
              className="absolute inset-0 grid place-items-center bg-black/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <span className="grid size-16 place-items-center rounded-full bg-sun text-storm-950 shadow-[0_10px_30px_-8px_rgb(0_0_0/0.8)] transition-transform group-hover:scale-110">
                <Play className="size-6 translate-x-0.5 fill-current" />
              </span>
              {playing && muted && <span className="absolute bottom-14 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/85">Click for sound</span>}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-8 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <div className="relative h-4 cursor-pointer" onPointerDown={seek}>
            <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/20">
              <div ref={bar} className="h-full origin-left rounded-full bg-[#ff4b3e]" style={{ transform: "scaleX(0)" }} />
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" onClick={onToggle} aria-label={playing ? "Pause" : "Play"} className="grid size-8 place-items-center rounded-full text-paper hover:bg-white/10">
              {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
            </button>
            <span ref={time} className="font-mono text-[11px] tabular-nums text-paper/80">
              0:00 / {fmt(clip.duration)}
            </span>
            <button type="button" onClick={onMute} aria-label={muted ? "Unmute" : "Mute"} className="ml-auto grid size-8 place-items-center rounded-full text-paper hover:bg-white/10">
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={clip.id}
          className="mt-3 flex items-baseline justify-between gap-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <p className={`min-w-0 font-medium leading-tight text-paper ${reel ? "text-[14px]" : "text-[16px]"}`}>{clip.title}</p>
          <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-storm-400">
            {String(index + 1).padStart(2, "0")}/{String(count).padStart(2, "0")}
          </p>
        </motion.div>
      </AnimatePresence>
      {(clip.client || clip.credit) && <p className="mt-1 text-[12px] text-storm-400">{clip.client ?? clip.credit}</p>}
    </div>
  )
}

/** A row of projects under each player. Hover plays a silent preview; click loads it into the player. */
function Rail({
  side,
  list,
  activeId,
  playing,
  live,
  onPick,
}: {
  side: Side
  list: ClientClip[]
  activeId: string
  playing: boolean
  live: boolean
  onPick: (id: string) => void
}) {
  const reel = side === "reel"
  const row = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: true })

  // Which arrows are needed: only when there's more to scroll in that direction.
  const measure = () => {
    const el = row.current
    if (!el) return
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 })
  }
  useEffect(() => {
    measure()
    const el = row.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keep the selected project in view when it changes (e.g. auto-advance).
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>("[aria-current='true']")
    const r = row.current
    if (!el || !r) return
    const er = el.getBoundingClientRect()
    const rr = r.getBoundingClientRect()
    if (er.left < rr.left) r.scrollBy({ left: er.left - rr.left - 16, behavior: "smooth" })
    else if (er.right > rr.right) r.scrollBy({ left: er.right - rr.right + 16, behavior: "smooth" })
  }, [activeId])

  const page = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.8, behavior: "smooth" })

  return (
    <div className="relative -mx-4 mt-3 md:mx-0">
      <div
        ref={row}
        onScroll={measure}
        className="flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-1 md:scroll-px-0 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: `linear-gradient(90deg, ${edge.start ? "#000" : "transparent"} 0, #000 40px, #000 calc(100% - 40px), ${edge.end ? "#000" : "transparent"} 100%)`,
        }}
      >
        {list.map((c, i) => (
          <Thumb key={c.id} clip={c} n={i + 1} reel={reel} active={c.id === activeId} playing={playing && c.id === activeId} live={live} onPick={() => onPick(c.id)} />
        ))}
      </div>
      {(["start", "end"] as const).map((side) => (
        <button
          key={side}
          type="button"
          onClick={() => page(side === "start" ? -1 : 1)}
          aria-label={side === "start" ? "Scroll left" : "Scroll right"}
          tabIndex={edge[side] ? -1 : 0}
          className={`absolute top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-storm-900/90 text-paper shadow-[0_8px_20px_-6px_rgb(0_0_0/0.8)] backdrop-blur transition-[opacity,transform,background-color] duration-300 hover:scale-105 hover:bg-storm-800 ${
            side === "start" ? "left-1 md:-left-3" : "right-1 md:-right-3"
          } ${edge[side] ? "pointer-events-none opacity-0" : "opacity-100"}`}
        >
          {side === "start" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      ))}
    </div>
  )
}

function Thumb({ clip, n, reel, active, playing, live, onPick }: { clip: ClientClip; n: number; reel: boolean; active: boolean; playing: boolean; live: boolean; onPick: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [hover, setHover] = useState(false)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (hover && live) v.play().catch(() => {})
    else v.pause()
  }, [hover, live])
  return (
    <button
      type="button"
      onClick={onPick}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => setHover(false)}
      aria-label={`Play ${clip.title}`}
      aria-current={active}
      title={clip.title}
      className={`group relative h-[96px] shrink-0 snap-start overflow-hidden rounded-lg bg-black text-left transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 ${
        reel ? "w-[54px]" : "w-[171px]"
      } ${active ? "shadow-[0_0_0_2px_var(--sun)]" : "shadow-[0_0_0_1px_rgb(255_255_255/0.12)] hover:shadow-[0_0_0_1px_rgb(255_255_255/0.45)]"}`}
    >
      <img src={posterOf(clip)} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
      <video
        ref={ref}
        src={hover ? previewOf(clip) : undefined}
        muted
        loop
        playsInline
        className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${hover ? "opacity-100" : "opacity-0"}`}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-black/60 px-1 py-px font-mono text-[9px] font-semibold text-paper">
        {playing && <span className="size-1.5 rounded-full bg-[#ff4b3e]" />}
        {String(n).padStart(2, "0")}
      </span>
      {!reel && <span className="absolute inset-x-1.5 bottom-1 truncate text-[11px] font-medium text-paper">{clip.title}</span>}
    </button>
  )
}
