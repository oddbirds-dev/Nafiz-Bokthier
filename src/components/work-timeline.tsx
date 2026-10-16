"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { ArrowUpRight, Eye, Play, Square, X } from "lucide-react"
import { embedUrl, externalLink, previewOf, thumbOf, videoOf, type Clip, type Reel, type Track } from "@/data/work"
import { recElapsed, timecode } from "@/lib/rec-clock"

const GAP = 14
// Seconds of "timeline" per pixel, so the ruler and timecode read like a real edit.
const SEC_PER_PX = 0.12

type Placed = Clip & { x: number; w: number; row: number }

function layout(reel: Reel, clipW: number, shortW: number): { placed: Placed[]; total: number } {
  const placed: Placed[] = []
  let total = 0
  reel.tracks.forEach((t, row) => {
    let x = t.offset * clipW
    for (const c of reel.clips.filter((c) => c.track === t.key)) {
      const w = c.kind === "short" ? shortW : clipW
      placed.push({ ...c, x, w, row })
      x += w + GAP
    }
    total = Math.max(total, x)
  })
  return { placed, total }
}

const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`
const fmtViews = (n?: number) => (!n ? "" : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K views` : `${n} views`)
const fmtDate = (d: string) =>
  new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`).toLocaleDateString("en-GB", { month: "short", year: "numeric" })

/**
 * Work as an editing timeline. The section pins; scrolling slides the tracks under a fixed playhead.
 * The clip under the playhead plays in the program monitor (top track wins, like a real NLE).
 * Hover a clip for its muted preview; click it to seek there and play it in the monitor. Track labels solo a track.
 */
export function WorkTimeline({ reel }: { reel: Reel }) {
  const { clips, tracks } = reel
  const section = useRef<HTMLElement>(null)
  const lane = useRef<HTMLDivElement>(null)
  const [laneW, setLaneW] = useState(1000)
  const [narrow, setNarrow] = useState(false)
  const [solo, setSolo] = useState<string | null>(null)
  const [activeId, setActiveId] = useState(clips[0].id)
  const [hoverId, setHoverId] = useState<string | null>(null)
  // The clip playing (with sound) in the program monitor. Seeking = the page is scrolling the playhead to it.
  const [playingId, setPlayingId] = useState<string | null>(null)
  const playingRef = useRef<string | null>(null)
  playingRef.current = playingId
  const seeking = useRef(false)
  const tcRef = useRef<HTMLSpanElement>(null)
  const base = useRef<number | null>(null)

  // Size the 16:9 monitor from the space the row actually has, so it never crops and never leaves
  // big gaps: desktop keeps the inspector right beside it; phones keep room for the clip info below.
  const row = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0, inspector: 320 })
  useEffect(() => {
    const el = row.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const W = el.clientWidth
      const H = el.clientHeight
      const phone = window.innerWidth < 768
      if (phone) {
        const w = Math.floor(Math.min(W, Math.max(120, H - 132) * (16 / 9)))
        setSize({ w, h: Math.round((w * 9) / 16), inspector: 0 })
      } else {
        const gap = 24
        const w = Math.floor(Math.min(W - 280 - gap, H * (16 / 9)))
        setSize({ w, h: Math.round((w * 9) / 16), inspector: Math.min(400, W - w - gap) })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const measure = () => {
      setLaneW(lane.current?.clientWidth ?? 1000)
      setNarrow(window.innerWidth < 768)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const { placed, total } = useMemo(() => layout(reel, narrow ? 210 : 330, narrow ? 96 : 150), [reel, narrow])
  const visible = (c: Clip) => !solo || c.track === solo

  const { scrollYProgress: p } = useScroll({ target: section, offset: ["start start", "end end"] })
  const playheadX = laneW * (narrow ? 0.18 : 0.28)
  const x = useTransform(p, (v) => playheadX - v * total)

  // Which clip sits under the playhead. Top track first, like an NLE.
  const update = (v: number) => {
    const pos = v * total
    // Until the section arrives, show the live REC time; after that it's frozen and the playhead adds to it.
    if (tcRef.current) tcRef.current.textContent = timecode((base.current ?? recElapsed()) + pos * SEC_PER_PX * 1000)
    const candidates = placed.filter(visible)
    const hits = candidates.filter((c) => pos >= c.x && pos <= c.x + c.w).sort((a, b) => a.row - b.row)
    // A clip that's playing keeps the monitor while it's under the playhead; otherwise the top track wins.
    const hit = hits.find((c) => c.id === playingRef.current) ?? hits[0]
    const near = hit ?? candidates.reduce((best, c) => (Math.abs(c.x + c.w / 2 - pos) < Math.abs(best.x + best.w / 2 - pos) ? c : best), candidates[0])
    if (seeking.current) return // keep the clicked clip while the playhead travels to it
    // Scrubbing onto another clip stops playback, like moving the playhead in an editor.
    if (near && near.id !== activeId) {
      setActiveId(near.id)
      if (playingRef.current && playingRef.current !== near.id) setPlayingId(null)
    }
  }

  // Click a clip: move the playhead onto it (by scrolling the pinned section), then play it in the monitor.
  const play = (clip: Clip) => {
    const c = placed.find((pc) => pc.id === clip.id)
    const el = section.current
    setActiveId(clip.id)
    setPlayingId(videoOf(clip) ? clip.id : null)
    if (!c || !el) return
    const progress = Math.min(1, Math.max(0, (c.x + c.w / 2) / total))
    const top = el.getBoundingClientRect().top + window.scrollY
    const target = top + progress * (el.offsetHeight - window.innerHeight)
    seeking.current = true
    const done = () => {
      seeking.current = false
    }
    const lenis = (window as Window & { __lenis?: { scrollTo(t: number, o: object): void } }).__lenis
    if (lenis) lenis.scrollTo(target, { duration: 0.9, onComplete: done })
    else window.scrollTo({ top: target, behavior: "smooth" })
    // Safety net: Lenis skips onComplete when already at the target.
    setTimeout(done, 1200)
  }
  useMotionValueEvent(p, "change", update)
  // The timecode continues from the hero's REC counter: it's captured the moment the section
  // starts entering the screen, then the playhead adds timeline time on top.
  const { scrollYProgress: enter } = useScroll({ target: section, offset: ["start end", "start start"] })
  useMotionValueEvent(enter, "change", (v) => {
    if (v > 0 && base.current === null) {
      base.current = recElapsed()
      update(p.get())
    }
  })
  useEffect(() => update(p.get()), [solo, total]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = clips.find((c) => c.id === activeId) ?? clips[0]
  const ticks = Math.ceil((total + laneW) / 60)

  return (
    <section ref={section} id={reel.id} aria-label={reel.eyebrow.replace(/^\d+ · /, "")} className="relative bg-storm-950" style={{ height: narrow ? "260svh" : "320svh" }}>
      <div className="sticky top-0 flex h-svh flex-col overflow-clip px-4 pb-4 pt-[84px] md:px-8 md:pb-6 md:pt-[100px]">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-sun">{reel.eyebrow}</p>
            <h2 className="mt-1 font-display text-[clamp(38px,5vw,72px)] uppercase leading-[0.9] text-paper">{reel.title}</h2>
          </div>
          <div className="text-right font-mono uppercase">
            <p className="text-[10px] tracking-[0.24em] text-storm-400">Timecode</p>
            <span ref={tcRef} className="block text-[clamp(16px,1.8vw,26px)] tabular-nums tracking-wider text-paper">
              00:00:00:00
            </span>
          </div>
        </div>

        {/* Program monitor + inspector (desktop) / monitor + clip info (phones) */}
        <div
          ref={row}
          className={`mt-4 flex min-h-0 flex-1 ${narrow ? "flex-col items-center justify-center gap-3" : "items-stretch justify-center gap-6"}`}
        >
          {size.w > 0 && (
            <>
              <div className={narrow ? "" : "flex items-center"}>
                <Monitor
                  clip={active}
                  size={size}
                  playing={playingId === active.id}
                  onPlay={() => play(active)}
                  onStop={() => setPlayingId(null)}
                />
              </div>
              {narrow ? (
                <ClipInfo clip={active} tracks={tracks} playing={playingId === active.id} onPlay={() => play(active)} onStop={() => setPlayingId(null)} />
              ) : (
                <div className="flex" style={{ width: size.inspector }}>
                  <Inspector clip={active} tracks={tracks} playing={playingId === active.id} onPlay={() => play(active)} onStop={() => setPlayingId(null)} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Timeline */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-storm-900/80 md:mt-5">
          <div className="flex">
            {/* Track headers double as filters (solo). */}
            <div className="w-[104px] shrink-0 border-r border-white/10 md:w-[170px]">
              <div className="flex h-7 items-center px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-storm-400">
                {solo ? "Solo" : "Tracks"}
              </div>
              {tracks.map((t) => {
                const on = !solo || solo === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSolo((s) => (s === t.key ? null : t.key))}
                    aria-pressed={solo === t.key}
                    className={`flex w-full items-center gap-1.5 border-t border-white/5 px-3 text-left transition-colors hover:bg-white/5 ${
                      narrow ? "h-[58px]" : "h-[70px]"
                    } ${solo === t.key ? "bg-sun/10" : ""}`}
                  >
                    <span className={`grid size-6 shrink-0 place-items-center rounded font-mono text-[10px] ${solo === t.key ? "bg-sun text-storm-950" : "bg-white/10 text-paper/80"}`}>
                      {t.code}
                    </span>
                    <span className={`min-w-0 truncate text-[12px] md:text-[13px] ${on ? "text-paper" : "text-paper/35"}`}>{narrow ? t.short : t.label}</span>
                    <Eye className={`ml-auto hidden size-3.5 shrink-0 md:block ${on ? "text-paper/60" : "text-paper/20"}`} />
                  </button>
                )
              })}
            </div>

            {/* Lane: ruler + tracks slide under the fixed playhead */}
            <div ref={lane} className="relative min-w-0 flex-1 overflow-clip">
              <motion.div style={{ x }} className="relative will-change-transform">
                <div className="relative h-7 border-b border-white/10" style={{ width: total + laneW }}>
                  {Array.from({ length: ticks }, (_, i) => (
                    <span key={i} className="absolute bottom-0 h-2 w-px bg-white/15" style={{ left: i * 60 }}>
                      {i % 4 === 0 && (
                        <span className="absolute bottom-2.5 left-1 whitespace-nowrap font-mono text-[9px] text-storm-400">
                          {timecode(i * 60 * SEC_PER_PX * 1000).slice(3, 8)}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                {tracks.map((t, row) => (
                  <div key={t.key} className={`relative border-t border-white/5 ${narrow ? "h-[58px]" : "h-[70px]"}`} style={{ width: total + laneW }}>
                    {placed
                      .filter((c) => c.row === row)
                      .map((c) => (
                        <ClipBlock
                          key={c.id}
                          clip={c}
                          active={c.id === activeId}
                          hovered={hoverId === c.id}
                          dimmed={!visible(c)}
                          onHover={(h) => setHoverId(h ? c.id : null)}
                          onOpen={() => play(c)}
                        />
                      ))}
                  </div>
                ))}
              </motion.div>
              {/* Playhead */}
              <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: playheadX }}>
                <div className="absolute -left-[7px] top-0 h-3 w-[15px] bg-sun [clip-path:polygon(0_0,100%_0,100%_55%,50%_100%,0_55%)]" />
                <div className="absolute -left-px top-0 h-full w-[2px] bg-sun shadow-[0_0_12px_var(--sun)]" />
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 hidden font-mono text-[10px] uppercase tracking-[0.22em] text-storm-400 md:block">
          Scroll to scrub · hover a clip to preview · click to play it in the monitor · tracks are filters
        </p>
      </div>
    </section>
  )
}

function ClipBlock({
  clip,
  active,
  hovered,
  dimmed,
  onHover,
  onOpen,
}: {
  clip: Placed
  active: boolean
  hovered: boolean
  dimmed: boolean
  onHover: (h: boolean) => void
  onOpen: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = video.current
    if (!v) return
    if (hovered) v.play().catch(() => {})
    else v.pause()
  }, [hovered])
  const reel = clip.kind === "short"
  const preview = previewOf(clip)
  return (
    <button
      type="button"
      aria-label={`Watch ${clip.title}`}
      disabled={dimmed}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover(true)}
      onPointerLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      onClick={onOpen}
      className={`group absolute inset-y-1.5 overflow-hidden rounded-md text-left transition-[opacity,box-shadow,filter] duration-300 ${
        dimmed ? "pointer-events-none opacity-15 grayscale" : "opacity-100"
      } ${active ? "ring-2 ring-sun" : "ring-1 ring-white/15 hover:ring-white/50"}`}
      style={{ left: clip.x, width: clip.w }}
    >
      {/* Filmstrip of the thumbnail, like clip frames in an editor */}
      <span
        className="absolute inset-0 bg-storm-800"
        style={{
          backgroundImage: `url(${thumbOf(clip)})`,
          backgroundSize: "auto 100%",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "left center",
        }}
      />
      {preview && (
        <video
          ref={video}
          src={preview}
          muted
          loop
          playsInline
          preload="none"
          className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-0"}`}
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-storm-950/85 via-storm-950/10 to-storm-950/40" />
      <span className={`absolute inset-x-0 top-0 h-[3px] ${reel ? "bg-sun/80" : "bg-storm-200/70"}`} />
      <span className="absolute inset-x-0 top-[3px] truncate bg-storm-950/80 px-2 py-0.5 text-[11px] font-medium text-paper backdrop-blur-sm md:text-[12px]">{clip.title}</span>
      {(clip.duration || clip.client) && (
        <span className="absolute bottom-1 left-1.5 max-w-[calc(100%-12px)] truncate rounded bg-storm-950/80 px-1 font-mono text-[9px] text-paper/80">
          {clip.duration ? fmtDuration(clip.duration) : clip.client}
        </span>
      )}
    </button>
  )
}

type PlayProps = { clip: Clip; playing: boolean; onPlay: () => void; onStop: () => void }

/**
 * Program monitor. Always exactly 16:9 at the size the timeline measured, so long-form never crops.
 * Idle: the muted preview loops. Playing: the video plays right here, with sound.
 */
function Monitor({ clip, size, playing, onPlay, onStop }: PlayProps & { size: { w: number; h: number } }) {
  const source = videoOf(clip)
  const embed = source && embedUrl(source)
  const preview = previewOf(clip)
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black" style={{ width: size.w, height: size.h }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={clip.id + (playing ? ":play" : "")}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: playing ? 1 : 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Vertical reels sit on a blurred fill of themselves. */}
            {clip.vertical && (
              <img src={thumbOf(clip)} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-2xl" />
            )}
            {playing && source ? (
              <div className="absolute inset-0 flex justify-center">
                {embed ? (
                  <iframe
                    src={embed}
                    title={clip.title}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    className={clip.vertical ? "aspect-[9/16] h-full" : "size-full"}
                  />
                ) : (
                  <video
                    src={"file" in source ? source.file : undefined}
                    poster={thumbOf(clip)}
                    controls
                    autoPlay
                    playsInline
                    className={clip.vertical ? "aspect-[9/16] h-full" : "size-full"}
                  />
                )}
              </div>
            ) : preview ? (
              <video src={preview} poster={thumbOf(clip)} muted loop autoPlay playsInline className="absolute inset-0 size-full object-contain" />
            ) : (
              // No preview loop: a slow push-in on the still keeps the monitor alive.
              <motion.img
                src={thumbOf(clip)}
                alt=""
                className={`absolute inset-0 size-full ${clip.vertical ? "object-contain" : "object-cover"}`}
                initial={{ scale: 1 }}
                animate={{ scale: 1.08 }}
                transition={{ duration: 12, ease: "linear" }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {playing ? (
          <>
            <span className="pointer-events-none absolute left-4 top-3 flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/90">
              <span className="size-1.5 animate-pulse rounded-full bg-sun" /> Playing
            </span>
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop and return to preview"
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/60 text-paper transition-colors hover:bg-black/80"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onPlay}
            disabled={!source}
            aria-label={source ? `Play ${clip.title}` : `${clip.title}: video coming soon`}
            className="group absolute inset-0 text-left"
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
            <span className="absolute left-4 top-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/80">
              <span className="size-1.5 rounded-full bg-sun" /> Program
            </span>
            <span className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
              <span className="line-clamp-2 max-w-[80%] text-[clamp(15px,1.5vw,24px)] font-medium leading-tight text-paper">{clip.title}</span>
              {source ? (
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sun text-storm-950 transition-transform group-hover:scale-110">
                  <Play className="size-5 translate-x-px fill-current" />
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/70">
                  Coming soon
                </span>
              )}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

function Inspector({ clip, tracks, playing, onPlay, onStop }: PlayProps & { tracks: Track[] }) {
  const track = tracks.find((t) => t.key === clip.track)!
  const source = videoOf(clip)
  const link = externalLink(source)
  const rows = [
    ...(clip.client ? [["Client", clip.client]] : []),
    ...(clip.role ? [["Role", clip.role]] : []),
    ["Track", `${track.code} · ${track.label}`],
    ["Format", clip.kind === "short" ? "Short / Reel · 9:16" : "Long-form · 16:9"],
    ...(clip.duration ? [["Runtime", fmtDuration(clip.duration)]] : []),
    ...(clip.date ? [["Released", fmtDate(clip.date)]] : []),
    ...(clip.views && clip.views >= 1000 ? [["Views", fmtViews(clip.views)]] : []),
  ]
  return (
    <div className="flex min-h-0 w-full flex-col rounded-2xl border border-white/10 bg-storm-900/60 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-storm-400">Inspector</p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={clip.id}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-storm-400">{k}</dt>
                <dd className="text-right text-paper">{v}</dd>
              </div>
            ))}
          </dl>
          {clip.blurb && <p className="mt-4 line-clamp-4 text-[13px] leading-relaxed text-paper/70">{clip.blurb}</p>}
          {clip.placeholder && (
            <p className="mt-4 rounded-lg border border-dashed border-sun/40 px-3 py-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-sun/80">
              Placeholder · real project coming
            </p>
          )}
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <button
              type="button"
              onClick={playing ? onStop : onPlay}
              disabled={!source}
              className="flex items-center justify-center gap-2 rounded-full bg-paper px-4 py-3 text-sm font-semibold text-storm-950 transition-transform enabled:hover:scale-[1.02] disabled:opacity-40"
            >
              {playing ? <Square className="size-3.5 fill-current" /> : <Play className="size-4 fill-current" />}
              {playing ? "Stop" : source ? "Play in monitor" : "Video coming soon"}
            </button>
            {link && (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] text-paper/70 transition-colors hover:text-paper"
              >
                {link.label} <ArrowUpRight className="size-3.5" />
              </a>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/** Phones: a compact read-out under the monitor (the inspector's job), with play and external link. */
function ClipInfo({ clip, tracks, playing, onPlay, onStop }: PlayProps & { tracks: Track[] }) {
  const track = tracks.find((t) => t.key === clip.track)!
  const source = videoOf(clip)
  const link = externalLink(source)
  const meta = [`${track.code} · ${track.short}`, clip.client, clip.duration && fmtDuration(clip.duration), clip.date && fmtDate(clip.date)]
    .filter(Boolean)
    .join(" · ")
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={clip.id}
        className="flex w-full flex-col gap-2"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-storm-400">
          {meta}
          {clip.placeholder && <span className="text-sun/80"> · Placeholder</span>}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={playing ? onStop : onPlay}
            disabled={!source}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-paper px-4 py-2.5 text-[13px] font-semibold text-storm-950 disabled:opacity-40"
          >
            {playing ? <Square className="size-3.5 fill-current" /> : <Play className="size-4 fill-current" />}
            {playing ? "Stop" : source ? "Play" : "Coming soon"}
          </button>
          {link && (
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="glass flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] text-paper"
            >
              {link.label.replace("Open on ", "")} <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
