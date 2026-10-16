"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowDown, Check, Film, Play, RotateCcw, Send, Square } from "lucide-react"
import { Magnetic, Scramble } from "@/components/motion-bits"

/* ------------------------------------------------------------------------------------------------
 * Services as an export dialog + render queue. The visitor picks a format, toggles pipeline stages
 * and delivery aspects, then "renders" it. After export, "Send this brief" hands the settings to the
 * Contact section through a window event:
 *   window.dispatchEvent(new CustomEvent("nafiz:brief", { detail: { format, stages, aspects } }))
 * ---------------------------------------------------------------------------------------------- */

type FormatId = "brand" | "reels" | "youtube" | "lyric"
type StageId = "script" | "shoot" | "edit" | "grade" | "sound" | "motion" | "captions"
type AspectId = "16:9" | "9:16" | "1:1" | "4:5"
type Phase = "idle" | "rendering" | "done"

const FORMATS: { id: FormatId; label: string; slug: string; desc: string; stages: StageId[]; aspects: AspectId[] }[] = [
  {
    id: "brand",
    label: "Brand film",
    slug: "brand_film",
    desc: "A cinematic film for a place or business, like my films for a jewellery store, hotels, river resorts and a restaurant.",
    stages: ["script", "shoot", "edit", "grade", "sound"],
    aspects: ["16:9"],
  },
  {
    id: "reels",
    label: "Reels / short-form pack",
    slug: "reels_pack",
    desc: "Vertical edits with motion graphics and kinetic captions, made for creators and businesses.",
    stages: ["edit", "sound", "motion", "captions"],
    aspects: ["9:16", "4:5"],
  },
  {
    id: "youtube",
    label: "YouTube long-form edit",
    slug: "youtube_edit",
    desc: "Your footage shaped into a paced, story-led video, the way I cut my own channel.",
    stages: ["script", "edit", "grade", "sound", "captions"],
    aspects: ["16:9"],
  },
  {
    id: "lyric",
    label: "Motion graphics / lyric video",
    slug: "lyric_video",
    desc: "Animated type and graphics timed to the track, like my animated lyric video.",
    stages: ["edit", "sound", "motion"],
    aspects: ["16:9", "9:16"],
  },
]

const STAGES: { id: StageId; label: string; note: string; weight: number }[] = [
  { id: "script", label: "Script & story", note: "Hook · structure", weight: 0.9 },
  { id: "shoot", label: "Shoot (incl. drone)", note: "Camera · drone", weight: 1.5 },
  { id: "edit", label: "Edit", note: "Premiere Pro", weight: 1.5 },
  { id: "grade", label: "Colour grade", note: "DaVinci Resolve", weight: 1.1 },
  { id: "sound", label: "Sound design", note: "Mix · SFX", weight: 1.0 },
  { id: "motion", label: "Motion graphics", note: "After Effects", weight: 1.3 },
  { id: "captions", label: "Captions", note: "Kinetic type", weight: 0.8 },
]

const ASPECTS: { id: AspectId; w: number; h: number; use: string }[] = [
  { id: "16:9", w: 22, h: 12.4, use: "YouTube · web" },
  { id: "9:16", w: 12.4, h: 22, use: "Reels · Shorts" },
  { id: "1:1", w: 16, h: 16, use: "Feed" },
  { id: "4:5", w: 14.4, h: 18, use: "Feed portrait" },
]

const FPS = 25
const pad = (n: number) => String(Math.floor(n)).padStart(2, "0")
const timecode = (s: number) => {
  const f = Math.floor((s % 1) * FPS)
  return `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}:${pad(f)}`
}

/** A tiny frame outline in the shape of an aspect ratio. */
function Frame({ a, active, scale = 1 }: { a: (typeof ASPECTS)[number]; active?: boolean; scale?: number }) {
  return (
    <span
      aria-hidden
      className={`block rounded-[2px] border-[1.5px] transition-colors ${active ? "border-sun bg-sun/15" : "border-storm-400/70"}`}
      style={{ width: a.w * scale, height: a.h * scale }}
    />
  )
}

function StepLabel({ n, title, hint }: { n: string; title: string; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-storm-200">
        <span className="text-sun">{n}</span> · {title}
      </p>
      {hint && <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-storm-400">{hint}</p>}
    </div>
  )
}

export function ServicesRender() {
  const section = useRef<HTMLElement>(null)
  const [format, setFormat] = useState<FormatId>("brand")
  const [stages, setStages] = useState<StageId[]>(FORMATS[0].stages)
  const [aspects, setAspects] = useState<AspectId[]>(FORMATS[0].aspects)
  const [phase, setPhase] = useState<Phase>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [sent, setSent] = useState(false)
  const [flash, setFlash] = useState(0)

  const fmt = FORMATS.find((f) => f.id === format)!
  const filename = `nafiz_${fmt.slug}_v1.mp4`

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    const el = section.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // The queue: one job per enabled stage, in pipeline order, each with a start time and duration.
  const jobs = useMemo(() => {
    const k = reduced ? 0.3 : 1
    let t = 0
    return STAGES.filter((s) => stages.includes(s.id)).map((s) => {
      const job = { ...s, start: t, dur: s.weight * k }
      t += job.dur
      return job
    })
  }, [stages, reduced])
  const total = jobs.reduce((a, j) => a + j.dur, 0)

  // Render clock. Runs only while rendering and on screen.
  useEffect(() => {
    if (phase !== "rendering" || !visible) return
    let id = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      setElapsed((e) => Math.min(total, e + dt))
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [phase, visible, total])

  useEffect(() => {
    if (phase === "rendering" && elapsed >= total) {
      setPhase("done")
      setFlash((f) => f + 1)
    }
  }, [phase, elapsed, total])

  // Any settings change after an export puts the queue back to "ready".
  const touch = () => {
    if (phase === "done") {
      setPhase("idle")
      setElapsed(0)
      setSent(false)
    }
  }
  const pickFormat = (id: FormatId) => {
    if (phase === "rendering" || id === format) return
    const f = FORMATS.find((x) => x.id === id)!
    touch()
    setFormat(id)
    setStages(f.stages)
    setAspects(f.aspects)
  }
  const toggleStage = (id: StageId) => {
    if (phase === "rendering") return
    touch()
    setStages((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }
  const toggleAspect = (id: AspectId) => {
    if (phase === "rendering") return
    touch()
    setAspects((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const canRender = jobs.length > 0 && aspects.length > 0
  const render = () => {
    if (!canRender) return
    setElapsed(0)
    setSent(false)
    setPhase("rendering")
  }
  const cancel = () => {
    setPhase("idle")
    setElapsed(0)
  }

  const orderedAspects = ASPECTS.filter((a) => aspects.includes(a.id))
  const sendBrief = () => {
    const detail = {
      format: fmt.label,
      stages: jobs.map((j) => j.label),
      aspects: orderedAspects.map((a) => a.id),
    }
    // The Contact section receives the brief and scrolls itself into view once its layout settles.
    window.dispatchEvent(new CustomEvent("nafiz:brief", { detail }))
    setSent(true)
  }

  const locked = phase === "rendering"
  const overall = total > 0 ? elapsed / total : 0
  const eta = Math.max(0, Math.ceil(total - elapsed))
  const activeIdx = jobs.findIndex((j) => elapsed >= j.start && elapsed < j.start + j.dur)

  return (
    <section
      ref={section}
      id="services"
      aria-label="Services"
      className="relative border-t border-white/5 bg-storm-950 px-4 pb-16 pt-[88px] md:px-8 md:pb-24 md:pt-[100px]"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-sun">05 · Services</p>
          <h2 className="mt-1 font-display text-[clamp(38px,5vw,72px)] uppercase leading-[0.9] text-paper">
            Render <span className="font-serif normal-case italic text-sun">your</span> project
          </h2>
        </div>
        <p className="max-w-[340px] text-[14px] leading-snug text-storm-200 md:text-right md:text-[13px] md:text-storm-400">
          Set up the export, hit render. Every project is quoted after a quick chat: no packages, no surprises.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:mt-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-6">
        {/* ---------------------------------------------------------------- Export settings */}
        <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-storm-900/80 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.7)]">
          <TitleBar title="Export settings" right={<span className="hidden sm:inline">Preset · Custom</span>} />

          <fieldset disabled={locked} className="flex flex-1 flex-col gap-6 p-4 md:gap-5 md:px-6 md:py-5">
            {/* 1. Format */}
            <div>
              <StepLabel n="01" title="Format" hint="Pick one" />
              <div role="radiogroup" aria-label="Format" className="grid grid-cols-2 gap-2">
                {FORMATS.map((f) => {
                  const on = f.id === format
                  return (
                    <button
                      key={f.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => pickFormat(f.id)}
                      className={`flex min-h-[54px] items-center gap-3 rounded-xl md:min-h-[48px] border px-3 py-2.5 text-left text-[14px] leading-tight transition-colors disabled:cursor-not-allowed md:text-[15px] ${
                        on ? "border-sun/70 bg-sun/10 text-paper" : "border-white/10 bg-white/[0.02] text-storm-200 enabled:hover:border-white/25 enabled:hover:text-paper"
                      }`}
                    >
                      <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${on ? "border-sun" : "border-storm-400"}`}>
                        {on && <span className="size-2 rounded-full bg-sun" />}
                      </span>
                      {f.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2.5 min-h-[3.2em] md:min-h-[2.8em]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={fmt.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="text-[14px] leading-snug text-storm-200"
                  >
                    {fmt.desc}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* 2. Pipeline */}
            <div>
              <StepLabel n="02" title="Pipeline" hint={`${jobs.length} of ${STAGES.length} stages`} />
              <div className="grid grid-cols-2 gap-2">
                {STAGES.map((s) => {
                  const on = stages.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      onClick={() => toggleStage(s.id)}
                      className={`flex min-h-[44px] items-center gap-2.5 rounded-lg md:min-h-[40px] border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed ${
                        on ? "border-sun/40 bg-sun/[0.07] text-paper" : "border-white/10 bg-transparent text-storm-400 enabled:hover:border-white/25 enabled:hover:text-storm-200"
                      }`}
                    >
                      <span className={`grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors ${on ? "border-sun bg-sun text-storm-950" : "border-storm-400/70"}`}>
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 text-[13px] leading-tight md:text-[14px]">{s.label}</span>
                      <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-storm-400 xl:inline">{s.note}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Delivery */}
            <div>
              <StepLabel n="03" title="Delivery" hint="Aspect ratios" />
              <div className="grid grid-cols-4 gap-2">
                {ASPECTS.map((a) => {
                  const on = aspects.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      aria-pressed={on}
                      aria-label={`${a.id} (${a.use})`}
                      onClick={() => toggleAspect(a.id)}
                      className={`flex flex-col items-center gap-2 rounded-xl border px-1 pb-2.5 pt-3 transition-colors md:flex-row md:gap-3 md:px-3 md:py-2.5 disabled:cursor-not-allowed ${
                        on ? "border-sun/70 bg-sun/10 text-paper" : "border-white/10 text-storm-400 enabled:hover:border-white/25 enabled:hover:text-storm-200"
                      }`}
                    >
                      <span className="grid h-7 place-items-center md:w-6">
                        <Frame a={a} active={on} />
                      </span>
                      <span className="flex flex-col items-center gap-1 md:items-start">
                        <span className="font-mono text-[12px] tabular-nums">{a.id}</span>
                        <span className="hidden truncate text-[11px] leading-none text-storm-400 md:block">{a.use}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/8 pt-4 font-mono md:pt-3.5 text-[11px] uppercase tracking-[0.14em] text-storm-400">
              <span>Output name</span>
              <span className="min-w-0 truncate normal-case tracking-normal text-storm-200">{filename}</span>
            </div>
          </fieldset>
        </div>

        {/* ---------------------------------------------------------------- Render queue */}
        <div className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-storm-900/80 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.7)]">
          <TitleBar
            title="Render queue"
            right={
              phase === "rendering" ? (
                <span className="flex items-center gap-2 text-paper">
                  <span className="size-2 rounded-full bg-[#ff4b3e]" style={{ animation: "rec-blink 1s steps(1) infinite" }} />
                  Rendering
                </span>
              ) : phase === "done" ? (
                <span className="text-sun">Complete</span>
              ) : (
                <span>{jobs.length ? "Ready" : "Empty"}</span>
              )
            }
          />

          {/* Clock */}
          <div className="border-b border-white/8 px-4 py-4 md:px-6">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
              <div>
                <p className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-storm-400">
                  Elapsed
                  <span className="tabular-nums tracking-[0.12em] text-sun">
                    ETA{" "}
                    {phase === "rendering" ? (
                      reduced ? (
                        `00:${pad(eta)}`
                      ) : (
                        <Scramble key={eta} text={`00:${pad(eta)}`} duration={0.35} />
                      )
                    ) : phase === "done" ? (
                      "00:00"
                    ) : (
                      "--:--"
                    )}
                  </span>
                </p>
                <p className={`mt-1 font-mono text-[26px] leading-none tabular-nums md:text-[32px] ${phase === "idle" ? "text-storm-400" : "text-paper"}`}>
                  {timecode(elapsed)}
                </p>
              </div>
              <Monitors aspects={orderedAspects} progress={phase === "done" ? 1 : overall} phase={phase} />
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-gradient-to-r from-sun-deep to-sun" style={{ width: `${overall * 100}%` }} />
            </div>
          </div>

          {/* Jobs */}
          <ol className="flex flex-1 flex-col justify-center px-2 py-2 md:px-3" aria-label="Jobs">
            {jobs.length === 0 && (
              <li className="px-3 py-8 text-center text-[14px] text-storm-400">Toggle a pipeline stage to queue a job.</li>
            )}
            {jobs.map((j, i) => {
              const p = phase === "done" ? 1 : Math.max(0, Math.min(1, (elapsed - j.start) / j.dur))
              const active = phase === "rendering" && i === activeIdx
              const done = p >= 1
              const status = done ? "Done" : active ? `${Math.floor(p * 100)}%` : "Queued"
              return (
                <li
                  key={j.id}
                  className={`grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-3 py-2.5 md:py-2 transition-colors ${active ? "bg-sun/[0.07]" : ""}`}
                >
                  <span className={`font-mono text-[11px] tabular-nums ${done || active ? "text-sun" : "text-storm-400"}`}>{pad(i + 1)}</span>
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-[14px] ${done || active ? "text-paper" : "text-storm-200"}`}>{j.label}</span>
                      <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-storm-400 sm:inline">{j.note}</span>
                    </div>
                    <div className="relative mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/[0.07]">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-sun" style={{ width: `${p * 100}%` }} />
                      {active && !reduced && (
                        <div
                          className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                          style={{ left: `calc(${p * 100}% - 2.5rem)` }}
                        />
                      )}
                    </div>
                  </div>
                  <span
                    className={`flex w-[62px] items-center justify-end gap-1 font-mono text-[11px] uppercase tabular-nums tracking-[0.08em] ${
                      done ? "text-sun" : active ? "text-paper" : "text-storm-400"
                    }`}
                  >
                    {done && <Check className="size-3" strokeWidth={3} />}
                    {status}
                  </span>
                </li>
              )
            })}
          </ol>

          {/* Action area */}
          <div className="mt-auto border-t border-white/8 p-4 md:p-6">
            <AnimatePresence mode="wait" initial={false}>
              {phase !== "done" ? (
                <motion.div key="go" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {phase === "idle" ? (
                    <>
                      <Magnetic strength={0.12}>
                        <button
                          type="button"
                          onClick={render}
                          disabled={!canRender}
                          className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-sun font-display text-[22px] uppercase tracking-[0.04em] text-storm-950 transition-[filter,opacity] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-35 md:h-16 md:text-[26px]"
                        >
                          <Play className="size-5 fill-current" />
                          Render
                          <span className="font-mono text-[11px] normal-case tracking-[0.1em] opacity-70">
                            {jobs.length} {jobs.length === 1 ? "job" : "jobs"} · {aspects.length} {aspects.length === 1 ? "ratio" : "ratios"}
                          </span>
                        </button>
                      </Magnetic>
                      <p className="mt-2.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-storm-400">
                        {canRender ? "A playful preview. No real files." : !jobs.length ? "Turn on at least one stage" : "Pick at least one aspect ratio"}
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={cancel}
                        className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-white/15 font-mono text-[12px] uppercase tracking-[0.2em] text-storm-200 transition-colors hover:border-white/30 hover:text-paper md:h-16"
                      >
                        <Square className="size-3.5 fill-current" />
                        Cancel render
                      </button>
                      <p className="mt-2.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-storm-400">
                        Job {Math.max(1, activeIdx + 1)} of {jobs.length}
                      </p>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-center gap-3 rounded-xl border border-sun/30 bg-storm-950/60 p-3">
                    <div className="grid size-16 shrink-0 place-items-center self-stretch rounded-lg bg-sun/10 text-sun">
                      <Film className="size-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-display text-[20px] uppercase leading-none text-paper">
                        Export complete
                        <span className="grid size-[18px] place-items-center rounded-full bg-sun text-storm-950">
                          <Check className="size-3" strokeWidth={3.5} />
                        </span>
                      </p>
                      <p className="mt-1.5 truncate font-mono text-[13px] text-storm-200">{filename}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {orderedAspects.map((a) => (
                          <span key={a.id} className="flex items-center gap-1.5 rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-storm-200">
                            <Frame a={a} active scale={0.5} />
                            {a.id}
                          </span>
                        ))}
                        <span className="rounded-md px-1 py-0.5 font-mono text-[11px] text-storm-400">
                          {jobs.length} {jobs.length === 1 ? "stage" : "stages"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={sendBrief}
                      className="relative flex h-14 flex-1 items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-sun font-display text-[20px] uppercase tracking-[0.04em] text-storm-950 transition hover:brightness-105 md:text-[22px]"
                    >
                      {!reduced && <span className="btn-shine" aria-hidden />}
                      <Send className="relative size-4" />
                      <span className="relative">Send this brief</span>
                    </button>
                    <button
                      type="button"
                      onClick={render}
                      aria-label="Render again"
                      title="Render again"
                      className="grid size-14 shrink-0 place-items-center rounded-xl border border-white/15 text-storm-200 transition-colors hover:border-white/30 hover:text-paper"
                    >
                      <RotateCcw className="size-5" />
                    </button>
                  </div>
                  <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-storm-400">
                    {sent ? (
                      <>
                        Brief added to the contact form <ArrowDown className="size-3" />
                      </>
                    ) : (
                      "Fills in the contact form. Bangla or English, both fine."
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export flash */}
          <AnimatePresence>
            {flash > 0 && phase === "done" && !reduced && (
              <motion.div
                key={flash}
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-sun"
                initial={{ opacity: 0.22 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
          <p className="sr-only" aria-live="polite">
            {phase === "done" ? `Export complete: ${filename}` : phase === "rendering" ? "Rendering" : ""}
          </p>
        </div>
      </div>
    </section>
  )
}

/** Output monitors: one frame per delivery ratio, filling with picture as the render runs. */
function Monitors({ aspects, progress, phase }: { aspects: (typeof ASPECTS)[number][]; progress: number; phase: Phase }) {
  const H = 40
  return (
    <div className="flex min-h-[58px] items-end gap-3" aria-hidden>
      {aspects.length === 0 && <p className="self-center font-mono text-[10px] uppercase tracking-[0.18em] text-storm-400">No delivery ratio picked</p>}
      {aspects.map((a) => {
        const w = Math.round((H * a.w) / a.h)
        return (
          <div key={a.id} className="flex flex-col items-center gap-1.5">
            <div
              className={`relative overflow-hidden rounded-[3px] border ${phase === "done" ? "border-sun/80" : "border-white/15"} bg-storm-950`}
              style={{ width: w, height: H }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-[linear-gradient(160deg,rgb(245_185_113/0.55),rgb(226_147_74/0.18)_55%,rgb(51_73_79/0.5))]"
                style={{ width: `${progress * 100}%` }}
              />
              {phase === "rendering" && <div className="absolute inset-y-0 w-px bg-paper/90" style={{ left: `${progress * 100}%` }} />}
              {phase === "done" && (
                <span className="absolute inset-0 grid place-items-center text-storm-950">
                  <Check className="size-4" strokeWidth={3} />
                </span>
              )}
            </div>
            <span className={`font-mono text-[10px] tabular-nums ${phase === "done" ? "text-sun" : "text-storm-400"}`}>{a.id}</span>
          </div>
        )
      })}
    </div>
  )
}

function TitleBar({ title, right }: { title: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-white/[0.02] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-storm-400 md:px-6">
      <span className="flex items-center gap-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2 rounded-full bg-storm-600" />
          <span className="size-2 rounded-full bg-storm-600" />
          <span className="size-2 rounded-full bg-storm-600" />
        </span>
        <span className="text-storm-200">{title}</span>
      </span>
      {right}
    </div>
  )
}
