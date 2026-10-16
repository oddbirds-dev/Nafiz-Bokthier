"use client"

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react"
import { AnimatePresence, motion, useInView } from "framer-motion"
import { ArrowUpRight, Camera, Clapperboard, Mail, MessageCircle, Play } from "lucide-react"

/* ------------------------------------------------------------------ contact details */
const CONTACT_EMAIL = "" // TODO: Nafiz's email
const WHATSAPP = "" // TODO: Nafiz's WhatsApp number in international format, digits only (e.g. 8801XXXXXXXXX)

const YOUTUBE = "https://www.youtube.com/@NafizBokthier"
const INSTAGRAM = "https://www.instagram.com/nafizbokthier/"
const IG_DM = "https://ig.me/m/nafizbokthier"

const TIMELINES = ["ASAP", "This month", "Later", "Just exploring"] as const
type Timeline = (typeof TIMELINES)[number]
type Method = "dm" | "email" | "whatsapp"

const ROLL = "A001"
const SCENE = "06"
const TAKE_KEY = "nafiz-slate-take"

type BriefDetail = { format?: string; stages?: string[]; aspects?: string[] }

/* ------------------------------------------------------------------ sound */
let audioCtx: AudioContext | null = null
/** A short, quiet wooden "clack": a filtered noise burst plus a falling click. Only ever called from a click. */
function clack() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    audioCtx ??= new AC()
    const ctx = audioCtx
    if (ctx.state === "suspended") void ctx.resume()
    const t = ctx.currentTime + 0.01
    const master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)

    const len = Math.floor(ctx.sampleRate * 0.09)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const band = ctx.createBiquadFilter()
    band.type = "bandpass"
    band.frequency.value = 2100
    band.Q.value = 0.9
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.9, t)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.085)
    noise.connect(band).connect(ng).connect(master)
    noise.start(t)

    const osc = ctx.createOscillator()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(1500, t)
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.03)
    const og = ctx.createGain()
    og.gain.setValueAtTime(0.6, t)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    osc.connect(og).connect(master)
    osc.start(t)
    osc.stop(t + 0.05)
  } catch {
    /* sound is decoration only */
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.setAttribute("readonly", "")
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand("copy")
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

/* ------------------------------------------------------------------ component */
export function ContactSlate() {
  const uid = useId()
  const section = useRef<HTMLElement>(null)
  const inView = useInView(section, { margin: "0px 0px -10% 0px" })

  const [name, setName] = useState("")
  const [what, setWhat] = useState("")
  const [reach, setReach] = useState("")
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [format, setFormat] = useState("")
  const [method, setMethod] = useState<Method>("dm")
  const [focus, setFocus] = useState<"name" | "what" | "reach" | null>(null)
  const [errors, setErrors] = useState<{ name?: boolean; what?: boolean }>({})

  const [take, setTake] = useState(1)
  const [date, setDate] = useState("")
  const [closed, setClosed] = useState(false)
  const [flash, setFlash] = useState(0)
  const [wrap, setWrap] = useState<number | null>(null)
  const [status, setStatus] = useState<{ copied: boolean; method: Method; text: string } | null>(null)
  const [briefStamp, setBriefStamp] = useState(0)
  const busy = useRef(false)

  useEffect(() => {
    setDate(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase())
    try {
      const n = Number(localStorage.getItem(TAKE_KEY))
      if (n > 0) setTake(n)
    } catch {
      /* private mode */
    }
  }, [])

  // The Services section hands over a brief.
  useEffect(() => {
    const onBrief = (e: Event) => {
      const d = ((e as CustomEvent<BriefDetail>).detail ?? {}) as BriefDetail
      const stages = (d.stages ?? []).filter(Boolean)
      const aspects = (d.aspects ?? []).filter(Boolean)
      const text = [d.format, stages.join(", "), aspects.join(", ")].filter(Boolean).join(" — ")
      if (!text) return
      setWhat(text.slice(0, 220))
      setFormat(aspects.join(" · ") || d.format || "")
      setErrors((x) => ({ ...x, what: false }))
      reopen()
      setBriefStamp(Date.now())
      // Scroll after the brief has rendered (layout above may shift), to an absolute position.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const el = section.current
          if (!el) return
          const r = el.getBoundingClientRect()
          if (r.top > window.innerHeight * 0.5 || r.bottom < window.innerHeight * 0.3) {
            const target = window.scrollY + r.top
            const lenis = (window as Window & { __lenis?: { scrollTo(t: number, o?: object): void } }).__lenis
            if (lenis) lenis.scrollTo(target, { duration: 1.4 })
            else window.scrollTo({ top: target, behavior: reduced() ? "auto" : "smooth" })
          }
        }),
      )
    }
    window.addEventListener("nafiz:brief", onBrief)
    return () => window.removeEventListener("nafiz:brief", onBrief)
  }, [])

  /** Any edit after a wrap starts the next take: the sticks open again. */
  function reopen() {
    setWrap(null)
    setClosed(false)
  }
  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    if (wrap !== null) reopen()
    set(v)
  }

  function clap() {
    clack()
    if (!reduced()) setFlash((f) => f + 1)
  }

  /** The clapper stick itself: a test clap. */
  function testClap() {
    if (busy.current || wrap !== null) return
    busy.current = true
    setClosed(true)
    window.setTimeout(clap, 60)
    window.setTimeout(() => {
      setClosed(false)
      busy.current = false
    }, 520)
  }

  function compose(n: number) {
    return [
      `Hi Nafiz! I'm ${name.trim()}.`,
      ``,
      `What we're making: ${what.trim()}`,
      timeline ? `Timeline: ${timeline}` : "",
      reach.trim() ? `Reach me at: ${reach.trim()}` : "",
      ``,
      `(Sent from your website — Scene ${SCENE}, Take ${n})`,
    ]
      .filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== ""))
      .join("\n")
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = { name: !name.trim(), what: !what.trim() }
    setErrors(errs)
    if (errs.name || errs.what) {
      document.getElementById(`${uid}-${errs.name ? "name" : "what"}`)?.focus()
      return
    }
    if (busy.current) return
    busy.current = true
    const n = take
    const text = compose(n)
    const m: Method = method === "email" && CONTACT_EMAIL ? "email" : method === "whatsapp" && WHATSAPP ? "whatsapp" : "dm"

    // Copy straight away, while the click still counts as a user gesture.
    const copied = m === "dm" ? copyText(text) : Promise.resolve(false)

    setClosed(true)
    window.setTimeout(clap, reduced() ? 0 : 70)
    window.setTimeout(async () => {
      const ok = await copied
      setWrap(n)
      setStatus({ copied: ok, method: m, text })
      setTake(n + 1)
      try {
        localStorage.setItem(TAKE_KEY, String(n + 1))
      } catch {
        /* ignore */
      }
      busy.current = false
    }, 380)

    // Then hand over to the chosen channel (still within the click's activation window).
    window.setTimeout(() => {
      if (m === "email") {
        const subject = `Take ${n}: ${what.trim().slice(0, 60)}`
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
      } else {
        const url = m === "whatsapp" ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}` : IG_DM
        const w = window.open(url, "_blank")
        if (w) w.opener = null
      }
    }, 900)
  }

  const rolling = Boolean(name || what || reach || timeline)
  const methods: { id: Method; label: string; icon: ReactNode }[] = [
    { id: "dm", label: "Instagram DM", icon: <MessageCircle className="size-3.5" /> },
    ...(CONTACT_EMAIL ? [{ id: "email" as const, label: "Email", icon: <Mail className="size-3.5" /> }] : []),
    ...(WHATSAPP ? [{ id: "whatsapp" as const, label: "WhatsApp", icon: <MessageCircle className="size-3.5" /> }] : []),
  ]

  return (
    <section
      ref={section}
      id="contact"
      className="relative overflow-hidden border-t border-white/5 bg-storm-950 px-4 pb-20 pt-[88px] md:px-8 md:pb-28 md:pt-[100px]"
    >
      <ChalkFilter />
      {/* soft key light behind the slate */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-10%] top-[10%] h-[70%] w-[70%] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgb(245 185 113 / 0.10), transparent)" }}
      />

      <div className="relative mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-sun">06 · Contact</p>
            <h2 className="mt-1 font-display text-[clamp(38px,5vw,72px)] uppercase leading-[0.9] text-paper">
              Slate it.{" "}
              <span className="font-serif normal-case italic tracking-normal text-sun">We roll.</span>
            </h2>
          </div>
          <p className="max-w-[380px] text-[15px] leading-relaxed text-storm-200/80">
            Fill in the slate and call action. Your take goes straight to my Instagram DMs — in Bangla or English.
          </p>
        </header>

        <div className="mt-10 grid items-start gap-8 md:mt-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-14">
          {/* ------------------------------------------------ the slate */}
          <div className="lg:sticky lg:top-[110px]">
            <Slate
              closed={closed}
              flash={flash}
              onClap={testClap}
              wrap={wrap}
              live={inView}
              rolling={rolling}
              briefStamp={briefStamp}
              focus={focus}
              prod={what}
              director={name}
              camera={format}
              take={wrap ?? take}
              date={date}
              schedule={timeline ?? ""}
              reach={reach}
            />
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-storm-400">
              Tap the sticks for a test clap
            </p>
          </div>

          {/* ------------------------------------------------ the form */}
          <form
            noValidate
            onSubmit={onSubmit}
            className="relative rounded-[22px] border border-white/10 bg-storm-900/70 p-5 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8)] md:p-7"
          >
            <div className="grid gap-5">
              <Field label="Your name" htmlFor={`${uid}-name`} error={errors.name ? "Who's directing? Add your name." : undefined}>
                <input
                  id={`${uid}-name`}
                  value={name}
                  maxLength={40}
                  autoComplete="name"
                  onFocus={() => setFocus("name")}
                  onBlur={() => setFocus(null)}
                  onChange={(e) => {
                    edit(setName)(e.target.value)
                    if (e.target.value.trim()) setErrors((x) => ({ ...x, name: false }))
                  }}
                  placeholder="e.g. Ayesha Rahman"
                  className={inputCls(errors.name)}
                />
              </Field>

              <Field
                label="What are we making?"
                htmlFor={`${uid}-what`}
                hint={`${what.length}/220`}
                error={errors.what ? "A line or two is plenty — what's the project?" : undefined}
              >
                <motion.div
                  key={briefStamp}
                  initial={briefStamp ? { boxShadow: "0 0 0 2px rgb(245 185 113 / 0.9)" } : false}
                  animate={{ boxShadow: "0 0 0 0px rgb(245 185 113 / 0)" }}
                  transition={{ duration: 1.6, ease: "easeOut" }}
                  className="rounded-xl"
                >
                  <textarea
                    id={`${uid}-what`}
                    value={what}
                    rows={3}
                    maxLength={220}
                    onFocus={() => setFocus("what")}
                    onBlur={() => setFocus(null)}
                    onChange={(e) => {
                      edit(setWhat)(e.target.value)
                      if (e.target.value.trim()) setErrors((x) => ({ ...x, what: false }))
                    }}
                    placeholder="A brand film for our resort, a run of reels, a YouTube edit…"
                    className={`${inputCls(errors.what)} resize-none leading-relaxed`}
                  />
                </motion.div>
              </Field>

              <Field label="How to reach you" htmlFor={`${uid}-reach`} hint="optional">
                <input
                  id={`${uid}-reach`}
                  value={reach}
                  maxLength={60}
                  onFocus={() => setFocus("reach")}
                  onBlur={() => setFocus(null)}
                  onChange={(e) => edit(setReach)(e.target.value)}
                  placeholder="Email, phone or @instagram"
                  className={inputCls()}
                />
              </Field>

              <fieldset>
                <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-storm-200">Timeline</legend>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Timeline">
                  {TIMELINES.map((t) => {
                    const on = timeline === t
                    return (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => edit(setTimeline)(on ? null : t)}
                        className={`min-h-11 rounded-full border px-4 text-[14px] transition-colors ${
                          on
                            ? "border-sun bg-sun text-storm-950"
                            : "border-white/12 bg-white/[0.03] text-storm-200 hover:border-white/30 hover:text-paper"
                        }`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {methods.length > 1 && (
                <fieldset>
                  <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-storm-200">Send via</legend>
                  <div className="mt-2 inline-flex rounded-full border border-white/10 bg-storm-950/60 p-1">
                    {methods.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={method === m.id}
                        onClick={() => setMethod(m.id)}
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[13px] transition-colors ${
                          method === m.id ? "bg-white/12 text-paper" : "text-storm-400 hover:text-paper"
                        }`}
                      >
                        {m.icon}
                        {m.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  className="group relative inline-flex min-h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-sun px-4 font-display text-[17px] sm:px-6 sm:text-[20px] uppercase tracking-wide text-storm-950 transition-[transform,background-color] hover:bg-[#f8c88a] active:scale-[0.98]"
                >
                  <Clapperboard className="size-5 transition-transform group-hover:-rotate-12" strokeWidth={2.2} />
                  Call action · Send take {take}
                </button>
                <p className="mt-2.5 text-center text-[12.5px] leading-snug text-storm-400">
                  {method === "email" && CONTACT_EMAIL
                    ? "Opens your email app with the message written for you."
                    : method === "whatsapp" && WHATSAPP
                      ? "Opens WhatsApp with the message written for you."
                      : "Copies your message, then opens my Instagram DMs so you can paste it."}
                </p>
              </div>

              <AnimatePresence>
                {status && wrap !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    role="status"
                    className="rounded-xl border border-sun/30 bg-sun/[0.07] p-4 text-[14px] leading-relaxed text-paper"
                  >
                    {status.method === "dm" ? (
                      status.copied ? (
                        <>
                          <strong className="font-semibold text-sun">Message copied — paste it in the DM.</strong> Instagram should
                          have opened in a new tab.{" "}
                          <a href={IG_DM} target="_blank" rel="noopener noreferrer" className="underline decoration-sun/60 underline-offset-4 hover:text-sun">
                            Open the DM again
                          </a>
                        </>
                      ) : (
                        <>
                          <strong className="font-semibold text-sun">Couldn&apos;t copy automatically.</strong> Copy the text below, then{" "}
                          <a href={IG_DM} target="_blank" rel="noopener noreferrer" className="underline decoration-sun/60 underline-offset-4 hover:text-sun">
                            open the DM
                          </a>
                          .
                          <textarea
                            readOnly
                            value={status.text}
                            rows={5}
                            onFocus={(e) => e.currentTarget.select()}
                            className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-storm-950/70 p-3 font-mono text-[12px] text-storm-200"
                          />
                        </>
                      )
                    ) : (
                      <strong className="font-semibold text-sun">
                        {status.method === "email" ? "Your email app should be open with the message ready." : "WhatsApp should be open with the message ready."}
                      </strong>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-6 border-t border-white/8 pt-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-storm-400">Or find me on</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <LinkChip href={YOUTUBE} icon={<Play className="size-4" />} label="YouTube" />
                <LinkChip href={INSTAGRAM} icon={<Camera className="size-4" />} label="Instagram" />
                <LinkChip href={IG_DM} icon={<MessageCircle className="size-4" />} label="DM on Instagram" />
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ form bits */
const inputCls = (err?: boolean) =>
  `block w-full rounded-xl border bg-storm-950/70 px-4 py-3 text-[16px] text-paper placeholder:text-storm-400/70 outline-none transition-colors focus:border-sun/80 focus:bg-storm-950 ${
    err ? "border-sun/70" : "border-white/10 hover:border-white/20"
  }`

function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="font-mono text-[11px] uppercase tracking-[0.2em] text-storm-200">
          {label}
        </label>
        {hint && <span className="font-mono text-[10.5px] text-storm-400">{hint}</span>}
      </div>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-1.5 text-[13px] text-sun"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function LinkChip({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-12 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[14px] text-storm-200 transition-colors hover:border-sun/50 hover:text-paper"
    >
      <span className="text-sun">{icon}</span>
      <span className="flex-1 whitespace-nowrap">{label}</span>
      <ArrowUpRight className="size-4 text-storm-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-sun" />
    </a>
  )
}

/* ------------------------------------------------------------------ the slate */
const CHALK = "#f1f2ec"
const STRIPES_A = `repeating-linear-gradient(118deg, ${CHALK} 0 7cqw, #0d0f10 7cqw 14cqw)`
const STRIPES_B = `repeating-linear-gradient(62deg, ${CHALK} 0 7cqw, #0d0f10 7cqw 14cqw)`

/** Rough chalk edges: a tiny turbulence displacement applied to slate text. */
function ChalkFilter() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <filter id="chalk-rough" x="-5%" y="-20%" width="110%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}

type SlateProps = {
  closed: boolean
  flash: number
  onClap: () => void
  wrap: number | null
  live: boolean
  rolling: boolean
  briefStamp: number
  focus: "name" | "what" | "reach" | null
  prod: string
  director: string
  camera: string
  take: number
  date: string
  schedule: string
  reach: string
}

function Slate(p: SlateProps) {
  const rm = reduced()
  return (
    <div className="relative mx-auto w-full max-w-[760px] [container-type:inline-size]">
      <div className="relative mx-auto w-[95%] md:w-full" style={{ transform: "rotate(-1deg)" }}>
        {/* --- clapper sticks */}
        <div className="relative z-10" style={{ height: "12cqw", marginTop: "12cqw" }}>
          {/* bottom stick (fixed) */}
          <div
            className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[0.6cqw] border border-black/60 shadow-[0_2px_0_rgb(0_0_0/0.5)]"
            style={{ height: "5.4cqw", background: STRIPES_B }}
          />
          {/* top stick (hinged at the left) */}
          <motion.button
            type="button"
            aria-label="Clap the slate"
            onClick={p.onClap}
            className="absolute inset-x-0 cursor-pointer overflow-hidden rounded-[0.6cqw] border border-black/60 shadow-[0_6px_14px_-4px_rgb(0_0_0/0.7)] outline-none focus-visible:ring-2 focus-visible:ring-sun"
            style={{ bottom: "5.6cqw", height: "5.4cqw", background: STRIPES_A, transformOrigin: "2.2cqw 100%" }}
            initial={false}
            animate={{ rotate: p.closed ? 0 : -8, y: p.closed ? "5.6cqw" : "0cqw" }}
            whileHover={p.closed || rm ? undefined : { rotate: -10.5 }}
            transition={
              rm
                ? { duration: 0 }
                : p.closed
                  ? { type: "spring", stiffness: 1400, damping: 22, mass: 0.6 }
                  : { type: "spring", stiffness: 260, damping: 18 }
            }
          />
          {/* hinge */}
          <div
            aria-hidden
            className="absolute z-20 rounded-full border border-black/70 bg-[radial-gradient(circle_at_35%_30%,#d9dcd9,#6b716f)] shadow"
            style={{ left: "0.9cqw", bottom: "4.1cqw", width: "2.8cqw", height: "2.8cqw" }}
          />
        </div>

        {/* --- the board */}
        <div
          className="relative overflow-hidden rounded-b-[1.4cqw] border border-black/70 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.9),inset_0_0_0_1px_rgb(255_255_255/0.04)]"
          style={{
            background:
              "radial-gradient(120% 80% at 30% 20%, rgb(255 255 255 / 0.06), transparent 60%), radial-gradient(60% 50% at 80% 90%, rgb(255 255 255 / 0.035), transparent 70%), #101213",
            color: CHALK,
          }}
        >
          {/* tally light */}
          <div className="absolute right-[2.4cqw] top-[1.8cqw] z-10 flex items-center gap-[0.9cqw]" style={{ fontSize: "max(9px,1.5cqw)" }}>
            <span
              className="block rounded-full"
              style={{
                width: "1.3cqw",
                height: "1.3cqw",
                minWidth: 7,
                minHeight: 7,
                background: p.rolling ? "#ff4b3e" : "rgb(255 255 255 / 0.18)",
                boxShadow: p.rolling ? "0 0 10px #ff4b3e" : "none",
                animation: p.rolling && p.live && !rm ? "rec-blink 1.2s steps(1) infinite" : "none",
              }}
            />
            <span className="font-mono uppercase tracking-[0.2em] text-white/55">{p.rolling ? "Rolling" : "Standby"}</span>
          </div>

          <div className="grid" style={{ filter: "url(#chalk-rough)" }}>
            {/* PROD */}
            <Row>
              <motion.div
                key={p.briefStamp}
                className="relative pb-[2cqw] pl-[2.6cqw] pr-[16cqw] pt-[2.2cqw]"
                initial={p.briefStamp && !rm ? { backgroundColor: "rgb(245 185 113 / 0.28)" } : false}
                animate={{ backgroundColor: "rgb(245 185 113 / 0)" }}
                transition={{ duration: 1.8, ease: "easeOut" }}
              >
                <Label>Prod.</Label>
                <Value
                  size="clamp(14px, 3.6cqw, 30px)"
                  lines={3}
                  value={p.prod}
                  placeholder="What are we making?"
                  caret={p.focus === "what" && p.live}
                  minH="calc(3 * 1.18em)"
                />
              </motion.div>
            </Row>

            {/* ROLL / SCENE / TAKE */}
            <Row cols="1fr 1fr 1.15fr">
              <Cell>
                <Label>Roll</Label>
                <Big>{ROLL}</Big>
              </Cell>
              <Cell>
                <Label>Scene</Label>
                <Big>{SCENE}</Big>
              </Cell>
              <Cell last>
                <Label>Take</Label>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={p.take}
                    initial={rm ? false : { y: "-60%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "60%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    <Big>{String(p.take).padStart(2, "0")}</Big>
                  </motion.div>
                </AnimatePresence>
              </Cell>
            </Row>

            {/* DIRECTOR / CAMERA */}
            <Row cols="1.3fr 1fr">
              <Cell>
                <Label>Director</Label>
                <Value size="clamp(14px, 3.4cqw, 28px)" value={p.director} placeholder="Your name" caret={p.focus === "name" && p.live} />
              </Cell>
              <Cell last>
                <Label>Camera / Format</Label>
                <Value size="clamp(13px, 2.8cqw, 22px)" value={p.camera} placeholder="TBD" />
              </Cell>
            </Row>

            {/* DATE / SCHEDULE / CONTACT */}
            <Row cols="1.25fr 1fr 1.3fr" last>
              <Cell>
                <Label>Date</Label>
                <Value size="clamp(11px, 2.5cqw, 20px)" value={p.date} placeholder="—" />
              </Cell>
              <Cell>
                <Label>Schedule</Label>
                <Value size="clamp(11px, 2.5cqw, 20px)" value={p.schedule} placeholder="—" />
              </Cell>
              <Cell last>
                <Label>Contact</Label>
                <Value size="clamp(11px, 2.5cqw, 20px)" value={p.reach} placeholder="—" caret={p.focus === "reach" && p.live} />
              </Cell>
            </Row>
          </div>

          {/* --- wrap card */}
          <AnimatePresence>
            {p.wrap !== null && (
              <motion.div
                className="absolute inset-0 z-20 grid place-items-center text-center"
                style={{ background: "radial-gradient(120% 90% at 50% 40%, #16191a, #0d0f10)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: rm ? 0 : 0.35, delay: rm ? 0 : 0.18 }}
              >
                <div style={{ filter: "url(#chalk-rough)" }}>
                  <p className="font-mono uppercase tracking-[0.3em] text-white/55" style={{ fontSize: "max(10px,1.7cqw)" }}>
                    Scene {SCENE} · Roll {ROLL}
                  </p>
                  <motion.p
                    className="mt-[1.5cqw] font-display uppercase leading-[0.9]"
                    style={{ fontSize: "clamp(34px, 11cqw, 96px)", color: CHALK }}
                    initial={rm ? false : { scale: 1.25, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 16, delay: rm ? 0 : 0.3 }}
                  >
                    Take {p.wrap}
                  </motion.p>
                  <motion.p
                    className="mt-[1cqw] font-serif italic text-sun"
                    style={{ fontSize: "clamp(22px, 6cqw, 52px)" }}
                    initial={rm ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rm ? 0 : 0.55, duration: 0.5 }}
                  >
                    — that&apos;s a wrap.
                  </motion.p>
                  <p className="mx-auto mt-[2.4cqw] max-w-[80%] font-mono uppercase tracking-[0.16em] text-white/60" style={{ fontSize: "max(10px,1.6cqw)" }}>
                    Edit any field to roll take {p.wrap + 1}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* --- flash */}
          <AnimatePresence>
            {p.flash > 0 && (
              <motion.div
                key={p.flash}
                aria-hidden
                className="pointer-events-none absolute inset-0 z-30 bg-white"
                initial={{ opacity: 0.85 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function Row({ children, cols, last }: { children: ReactNode; cols?: string; last?: boolean }) {
  return (
    <div className={`grid ${last ? "" : "border-b-[3px] border-white/70"}`} style={{ gridTemplateColumns: cols ?? "1fr" }}>
      {children}
    </div>
  )
}
function Cell({ children, last }: { children: ReactNode; last?: boolean }) {
  return <div className={`min-w-0 px-[2.6cqw] pb-[1.8cqw] pt-[1.6cqw] ${last ? "" : "border-r-[3px] border-white/70"}`}>{children}</div>
}
function Label({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono font-semibold uppercase tracking-[0.18em] text-white/60" style={{ fontSize: "max(8.5px, 1.45cqw)" }}>
      {children}
    </p>
  )
}
function Big({ children }: { children: ReactNode }) {
  return (
    <p className="mt-[0.4cqw] font-display leading-none tracking-wide" style={{ fontSize: "clamp(26px, 7.4cqw, 62px)" }}>
      {children}
    </p>
  )
}
function Value({
  value,
  placeholder,
  size,
  lines = 1,
  caret,
  minH,
}: {
  value: string
  placeholder: string
  size: string
  lines?: number
  caret?: boolean
  minH?: string
}) {
  const empty = !value.trim()
  return (
    <p
      className="mt-[0.8cqw] break-words font-mono uppercase"
      style={{
        fontSize: size,
        lineHeight: 1.18,
        letterSpacing: "0.02em",
        minHeight: minH,
        textShadow: empty ? "none" : "0 0 1px rgb(255 255 255 / 0.7), 0 0 8px rgb(255 255 255 / 0.12)",
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        ...(lines === 1 ? { whiteSpace: "nowrap", textOverflow: "ellipsis", display: "block" } : {}),
      }}
    >
      <span className={empty ? "text-white/22" : ""}>{empty ? placeholder : value}</span>
      {caret && (
        <span
          aria-hidden
          className="ml-[0.1em] inline-block w-[0.55em] translate-y-[0.1em] bg-white/80"
          style={{ height: "0.95em", animation: "rec-blink 1s steps(1) infinite" }}
        />
      )}
    </p>
  )
}
