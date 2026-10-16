"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion"

/* ------------------------------------------------------------------------------------------------
 * About as a rack focus. The section pins for a short scroll; scrolling turns a cinema lens focus
 * ring and the focus pulls from one "plane" of copy to the next. Only the plane at the current
 * focus distance is sharp; the rest sit blurred and dim like real depth of field.
 * ---------------------------------------------------------------------------------------------- */

type Plane = { mark: string; lead: string; accent: string; body: string }

// DRAFT copy: confirm with Nafiz (all lines use only the agreed facts; wording is mine)
const PLANES: Plane[] = [
  {
    mark: "∞",
    lead: "I'm Nafiz",
    accent: "Bokthier.",
    body: "Video editor, filmmaker and content creator from Bangladesh. I work in Bangla and English.",
  },
  {
    mark: "5",
    lead: "I shoot, cut",
    accent: "and colour.",
    body: "Brand films for a jewellery store, hotels, houseboats, river resorts and a restaurant, shot in Dhaka and out on the rivers and haors.",
  },
  {
    mark: "2",
    lead: "Then I make it",
    accent: "move.",
    body: "Reels with motion graphics and kinetic captions, sound design under every cut, and an animated lyric video.",
  },
  {
    mark: "1",
    lead: "And I teach",
    accent: "it.",
    body: "On YouTube, in Bangla: video editing, storytelling and content creation. My most-viewed upload is “This is How I Actually Learned Video Editing” (22.6K views).",
  },
]

const MARKINGS = [
  "Based in Bangladesh",
  "Bangla + English",
  "YouTube educator",
  "Brand films / Reels / Motion",
  "Premiere Pro",
  "After Effects",
  "DaVinci Resolve",
]

const QUOTE = "They call me MasterChef, because I always cook."

/* Focus-distance scale engraved on the ring. Plane i sits on scale mark 2i (∞, 5, 2, 1 m). */
const SCALE = ["∞", "10", "5", "3", "2", "1.5", "1"]
const SCALE_M = [20, 10, 5, 3, 2, 1.5, 1]
const STEP = 28 // degrees between scale marks
const rd = (n: number) => Math.round(n * 100) / 100

/* Scroll progress → focus position (0..3). Each plane holds focus for a moment before the next rack. */
const P_KEYS = [0.04, 0.14, 0.24, 0.34, 0.44, 0.54, 0.64, 0.74]
const F_KEYS = [0, 0, 1, 1, 2, 2, 3, 3]

function focusReadout(f: number) {
  const m = f * 2
  if (m < 0.55) return "∞"
  const lo = Math.floor(m)
  const hi = Math.min(SCALE_M.length - 1, lo + 1)
  const t = m - lo
  const v = SCALE_M[lo] + (SCALE_M[hi] - SCALE_M[lo]) * t
  return `${v.toFixed(1)}m`
}

function useNarrow() {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return narrow
}

export function AboutFocus() {
  // Read after mount (not during SSR) so server and client markup match.
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return reduced ? <StillAbout /> : <PinnedAbout />
}

function PinnedAbout() {
  const section = useRef<HTMLElement>(null)
  const narrow = useNarrow()
  const { scrollYProgress: p } = useScroll({ target: section, offset: ["start start", "end end"] })
  const f = useTransform(p, P_KEYS, F_KEYS)

  return (
    <section
      ref={section}
      id="about"
      aria-label="About"
      className="relative border-t border-white/5 bg-storm-950"
      style={{ height: narrow ? "220svh" : "260svh" }}
    >
      <Stage p={p} f={f} narrow={narrow} />
    </section>
  )
}

/* ---------------------------------------------------------------------------------------------- */

function Stage({ p, f, narrow }: { p: MotionValue<number>; f: MotionValue<number>; narrow: boolean }) {
  // Spacing between planes and where the focus band sits (both in svh).
  const S = narrow ? 25 : 23
  const BAND = narrow ? 60 : 52
  const maxBlur = narrow ? 4 : 8

  const rot = useTransform(f, (v) => -STEP * 2 * v)
  const listY = useTransform(f, (v) => `${-v * S}svh`)
  // 0 when a plane is sharp, 1 halfway through a rack: drives focus breathing + bokeh swell.
  const rack = useTransform(f, (v) => Math.abs(v - Math.round(v)) * 2)
  const breathe = useTransform(rack, [0, 1], [1, 1.018])
  const endT = useTransform(p, [0.78, 0.9], [0, 1])
  const endY = useTransform(endT, [0, 1], [24, 0])
  const bokehY = useTransform(p, [0, 1], ["10svh", "-10svh"])
  const bokehScale = useTransform(rack, [0, 1], [1, 1.35])
  const bokehOpacity = useTransform(rack, [0, 1], [0.5, 1])

  const [hud, setHud] = useState({ dist: "∞", plane: 1 })
  useMotionValueEvent(f, "change", (v) => {
    const next = { dist: focusReadout(v), plane: Math.round(v) + 1 }
    setHud((h) => (h.dist === next.dist && h.plane === next.plane ? h : next))
  })

  // Lens geometry: D = lens diameter. Its centre sits on the focus band, partly off the right edge.
  const lensVars = {
    "--D": narrow ? "84vw" : "min(76svh, 60vw)",
    "--band": `${narrow ? 33 : BAND}svh`,
  } as CSSProperties

  return (
    <div className="sticky top-0 h-svh overflow-clip" style={lensVars}>
      {/* BACKGROUND: soft bokeh that swells while the focus is mid-rack */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ y: bokehY }}>
        <motion.div className="absolute inset-0" style={{ scale: bokehScale, opacity: bokehOpacity }}>
          {(narrow ? BOKEH.slice(0, 3) : BOKEH).map((b, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: b.x,
                top: b.y,
                width: b.s,
                height: b.s,
                background: b.warm ? "rgb(245 185 113 / 0.10)" : "rgb(111 138 144 / 0.10)",
                boxShadow: b.warm ? "inset 0 0 0 1px rgb(245 185 113 / 0.12)" : "inset 0 0 0 1px rgb(195 210 212 / 0.08)",
                filter: "blur(2px)",
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* MIDGROUND: the lens, partly off the right edge, turning with scroll */}
      <motion.div
        aria-hidden
        className={`pointer-events-none absolute ${narrow ? "opacity-70" : "opacity-100"}`}
        style={{
          width: "var(--D)",
          height: "var(--D)",
          top: "calc(var(--band) - var(--D) / 2)",
          right: narrow ? "calc(var(--D) * -0.36)" : "calc(var(--D) * -0.3)",
        }}
      >
        <Lens rot={rot} />
      </motion.div>

      {/* Wash so copy stays readable where it crosses the lens */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: narrow
            ? "linear-gradient(180deg, rgb(7 13 15 / 0.1) 0%, rgb(7 13 15 / 0.2) 30%, rgb(7 13 15 / 0.85) 58%, rgb(7 13 15 / 0.92) 100%)"
            : "linear-gradient(90deg, rgb(7 13 15 / 0.92) 0%, rgb(7 13 15 / 0.7) 38%, rgb(7 13 15 / 0) 62%)",
        }}
      />

      {/* Header (above the fade that swallows planes scrolling under it) */}
      <div className="relative z-[16] px-4 pt-[88px] md:px-8 md:pt-[100px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-sun">04 · About</p>
        <h2 className="mt-1 font-display text-[clamp(38px,5vw,72px)] uppercase leading-[0.9] text-paper">
          Pulling <span className="font-serif normal-case italic text-sun">focus</span>
        </h2>
      </div>

      {/* Viewfinder frame around the focus band + HUD read-out */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-2 z-[17] md:left-5"
        style={{
          top: `${BAND - (narrow ? 11 : 10)}svh`,
          height: `${narrow ? 22 : 20}svh`,
          width: narrow ? "calc(100% - 16px)" : "min(780px, 56vw)",
        }}
      >
        {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
          <span key={c} className={`absolute h-4 w-4 border-white/30 ${c}`} />
        ))}
        <p className="absolute -top-6 right-0 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-storm-200 md:text-[11px]">
          <span className="text-sun">◆</span>
          <span>
            Focus <span className="inline-block min-w-[4.2ch] text-paper">{hud.dist}</span>
          </span>
          <span className="text-storm-600">·</span>
          <span>T1.5</span>
          <span className="text-storm-600">·</span>
          <span>35mm</span>
          <span className="hidden text-storm-600 md:inline">·</span>
          <span className="hidden md:inline">
            Plane {hud.plane}/{PLANES.length}
          </span>
        </p>
      </div>

      {/* Hairline from the focus band to the lens index mark (desktop) */}
      {!narrow && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 hidden h-px md:block"
          style={{
            top: `${BAND}svh`,
            left: "min(800px, 58vw)",
            right: "calc(var(--D) * 0.78 + 26px)",
            background: "linear-gradient(90deg, rgb(245 185 113 / 0), rgb(245 185 113 / 0.55))",
          }}
        />
      )}

      {/* FOREGROUND: focus planes. The list slides so the plane in focus sits on the band. */}
      <div
        className="absolute inset-0 z-[12] px-4 md:px-8"
        style={{
          paddingTop: `${BAND}svh`,
          maskImage: `linear-gradient(180deg, transparent ${BAND - S + 2}svh, #000 ${BAND - S / 2 + 2}svh)`,
          WebkitMaskImage: `linear-gradient(180deg, transparent ${BAND - S + 2}svh, #000 ${BAND - S / 2 + 2}svh)`,
        }}
      >
        <motion.div style={{ y: listY, scale: breathe }} className="relative origin-left">
          {PLANES.map((pl, i) => (
            <FocusPlane key={i} plane={pl} i={i} f={f} S={S} maxBlur={maxBlur} narrow={narrow} />
          ))}
        </motion.div>
      </div>

      {/* End state: lens markings + sign-off */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-20 px-4 pb-5 md:px-8 md:pb-7"
        style={{ opacity: endT, y: endY }}
      >
        <div style={{ maxWidth: narrow ? undefined : "min(820px, 60vw)" }}>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-white/10 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-storm-200 md:text-[11px]">
            {MARKINGS.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-sun" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3 font-serif text-[clamp(19px,1.8vw,26px)] italic leading-tight text-paper/85">
            “{QUOTE}”
            <span className="font-mono text-[10px] not-italic uppercase tracking-[0.2em] text-storm-400">my Instagram bio</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

function FocusPlane({
  plane,
  i,
  f,
  S,
  maxBlur,
  narrow,
}: {
  plane: Plane
  i: number
  f: MotionValue<number>
  S: number
  maxBlur: number
  narrow: boolean
}) {
  const d = useTransform(f, (v) => Math.abs(v - i))
  const filter = useTransform(d, (v) => `blur(${(Math.min(v, 1.4) * maxBlur).toFixed(2)}px)`)
  const opacity = useTransform(d, [0, 1, 1.6], [1, 0.3, 0])
  const scale = useTransform(d, [0, 1], [1, 0.94])
  // Out-of-focus planes drift sideways a touch: near planes one way, far planes the other.
  const x = useTransform(f, (v) => (i - v) * (narrow ? 6 : 18))
  const markColor = useTransform(d, [0, 0.5], ["#f5b971", "#6f8a90"])

  return (
    <div className="absolute inset-x-0 -translate-y-1/2" style={{ top: `${i * S}svh` }}>
      <motion.div style={{ filter, opacity, scale, x }} className="origin-left will-change-[filter,opacity]">
        <motion.p style={{ color: markColor }} className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] md:text-[11px]">
          Plane 0{i + 1} · {plane.mark === "∞" ? "∞" : `${plane.mark} m`}
        </motion.p>
        <p className="font-display text-[clamp(34px,4.3vw,66px)] uppercase leading-[0.92] text-paper">
          {plane.lead} <span className="font-serif normal-case italic text-sun">{plane.accent}</span>
        </p>
        <p className="mt-3 max-w-[34rem] text-[15px] leading-relaxed text-storm-200 md:text-[17px]">{plane.body}</p>
      </motion.div>
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

const BOKEH = [
  { x: "8%", y: "70%", s: 90, warm: false },
  { x: "38%", y: "22%", s: 60, warm: true },
  { x: "52%", y: "78%", s: 130, warm: true },
  { x: "22%", y: "38%", s: 46, warm: false },
  { x: "64%", y: "12%", s: 80, warm: false },
  { x: "46%", y: "52%", s: 36, warm: true },
]

/** Cinema lens: the photoreal render if it exists, an SVG lens underneath as fallback, plus the
 *  focus-distance ring (rotating) and a fixed sun index mark on its left side. */
function Lens({ rot }: { rot: MotionValue<number> }) {
  const [img, setImg] = useState(true)
  return (
    <div className="relative h-full w-full">
      {/* warm rim light behind the barrel */}
      <div
        className="absolute -inset-[18%] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgb(245 185 113 / 0.10), rgb(245 185 113 / 0.03) 60%, transparent)" }}
      />

      {/* Focus-distance scale ring: slightly larger than the lens, turns with focus */}
      <motion.svg
        viewBox="-130 -130 260 260"
        className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 overflow-visible"
        style={{ rotate: rot }}
      >
        <circle r="126" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="0.5" />
        <circle r="104" fill="none" stroke="rgb(255 255 255 / 0.10)" strokeWidth="0.5" />
        {Array.from({ length: 90 }, (_, k) => {
          const a = (k * 4 * Math.PI) / 180
          const r1 = 104
          const r2 = k % 7 === 0 ? 110 : 107
          return (
            <line
              key={k}
              x1={rd(Math.cos(a) * r1)}
              y1={rd(Math.sin(a) * r1)}
              x2={rd(Math.cos(a) * r2)}
              y2={rd(Math.sin(a) * r2)}
              stroke="rgb(195 210 212 / 0.25)"
              strokeWidth="0.4"
            />
          )
        })}
        {SCALE.map((s, k) => {
          const deg = 180 + STEP * k
          const a = (deg * Math.PI) / 180
          return (
            <g key={s} transform={`translate(${rd(Math.cos(a) * 117)} ${rd(Math.sin(a) * 117)})`}>
              <ScaleLabel text={s} deg={deg} rot={rot} />
              <line
                x1={rd(Math.cos(a) * -13)}
                y1={rd(Math.sin(a) * -13)}
                x2={rd(Math.cos(a) * -7)}
                y2={rd(Math.sin(a) * -7)}
                stroke="rgb(238 243 242 / 0.6)"
                strokeWidth="0.7"
              />
            </g>
          )
        })}
      </motion.svg>

      {/* fixed index mark at 9 o'clock */}
      <svg viewBox="-130 -130 260 260" className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 overflow-visible">
        <path d="M -131 0 L -137 -4 L -137 4 Z" fill="#f5b971" />
        <line x1="-129" y1="0" x2="-124" y2="0" stroke="#f5b971" strokeWidth="0.8" />
      </svg>

      {/* SVG fallback lens (always rendered under the photo) */}
      <motion.svg viewBox="-100 -100 200 200" className="absolute inset-0 h-full w-full" style={{ rotate: rot }}>
        <defs>
          <radialGradient id="af-glass" cx="42%" cy="40%" r="62%">
            <stop offset="0%" stopColor="#1b3237" />
            <stop offset="55%" stopColor="#0a1416" />
            <stop offset="100%" stopColor="#020405" />
          </radialGradient>
          <radialGradient id="af-barrel" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="#15262a" />
            <stop offset="100%" stopColor="#0c1719" />
          </radialGradient>
        </defs>
        <circle r="100" fill="url(#af-barrel)" stroke="rgb(255 255 255 / 0.12)" strokeWidth="0.6" />
        {Array.from({ length: 120 }, (_, k) => {
          const a = (k * 3 * Math.PI) / 180
          return (
            <line key={k} x1={rd(Math.cos(a) * 88)} y1={rd(Math.sin(a) * 88)} x2={rd(Math.cos(a) * 98)} y2={rd(Math.sin(a) * 98)} stroke="rgb(0 0 0 / 0.55)" strokeWidth="1.1" />
          )
        })}
        <circle r="86" fill="#070d0f" stroke="rgb(255 255 255 / 0.14)" strokeWidth="0.6" />
        <circle r="80" fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth="2" />
        <circle r="70" fill="url(#af-glass)" stroke="rgb(0 0 0 / 0.8)" strokeWidth="2" />
        <circle r="52" fill="none" stroke="rgb(195 210 212 / 0.06)" strokeWidth="0.6" />
        <circle r="34" fill="none" stroke="rgb(195 210 212 / 0.05)" strokeWidth="0.6" />
        <circle r="14" fill="rgb(0 0 0 / 0.5)" />
      </motion.svg>

      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <motion.img
          src="/images/gen/lens-front.webp"
          alt=""
          draggable={false}
          onError={() => setImg(false)}
          className="absolute inset-0 h-full w-full select-none rounded-full object-contain"
          style={{ rotate: rot }}
        />
      )}

      {/* fixed glass reflections (do not turn with the ring) */}
      <svg viewBox="-100 -100 200 200" className="absolute inset-0 h-full w-full">
        <path d="M -52 -38 A 64 64 0 0 1 20 -64" fill="none" stroke="rgb(245 185 113 / 0.35)" strokeWidth="3" strokeLinecap="round" style={{ filter: "blur(1.5px)" }} />
        <path d="M 40 46 A 64 64 0 0 1 -6 62" fill="none" stroke="rgb(195 210 212 / 0.18)" strokeWidth="2" strokeLinecap="round" style={{ filter: "blur(1px)" }} />
        <ellipse cx="-24" cy="-28" rx="10" ry="5" fill="rgb(238 243 242 / 0.08)" transform="rotate(-35 -24 -28)" />
      </svg>
    </div>
  )
}

/** Scale numbers stay upright while the ring turns. */
function ScaleLabel({ text, deg, rot }: { text: string; deg: number; rot: MotionValue<number> }) {
  const counter = useTransform(rot, (r) => -r)
  const pos = useTransform(rot, (r) => {
    // brighter when this mark sits under the index (180°)
    const at = (((deg + r - 180) % 360) + 540) % 360 - 180
    return Math.abs(at) < 10 ? 1 : 0.45
  })
  return (
    <motion.text
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="var(--font-mono)"
      fontSize="7"
      fill="#eef3f2"
      style={{ rotate: counter, opacity: pos }}
    >
      {text}
    </motion.text>
  )
}

/* ---------------------------------------------------------------------------------------------- */

/** prefers-reduced-motion: no pinning, no blur. Everything shown sharp, in order. */
function StillAbout() {
  return (
    <section id="about" aria-label="About" className="relative border-t border-white/5 bg-storm-950 px-4 pb-16 pt-[88px] md:px-8 md:pt-[100px]">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-sun">04 · About</p>
      <h2 className="mt-1 font-display text-[clamp(38px,5vw,72px)] uppercase leading-[0.9] text-paper">
        Pulling <span className="font-serif normal-case italic text-sun">focus</span>
      </h2>
      <div className="mt-10 grid gap-10 md:max-w-[820px]">
        {PLANES.map((pl, i) => (
          <div key={i}>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.24em] text-storm-400">
              Plane 0{i + 1} · {pl.mark === "∞" ? "∞" : `${pl.mark} m`}
            </p>
            <p className="font-display text-[clamp(34px,4.3vw,66px)] uppercase leading-[0.92] text-paper">
              {pl.lead} <span className="font-serif normal-case italic text-sun">{pl.accent}</span>
            </p>
            <p className="mt-3 max-w-[34rem] text-[15px] leading-relaxed text-storm-200 md:text-[17px]">{pl.body}</p>
          </div>
        ))}
      </div>
      <ul className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-y border-white/10 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-storm-200 md:max-w-[820px]">
        {MARKINGS.map((m) => (
          <li key={m} className="flex items-center gap-2">
            <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-sun" />
            <span>{m}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-serif text-[22px] italic text-paper/85">“{QUOTE}”</p>
    </section>
  )
}
