"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion"
import { ArrowDown, ArrowUpRight, Camera } from "lucide-react"
import { HeroName } from "./hero-name"
import { Letterbox, Magnetic, Scramble, SplitWords } from "./motion-bits"
import { HeroRain } from "./hero-rain"
import { recElapsed, timecode } from "@/lib/rec-clock"

const SKY = "/images/sky2-2400.webp"
const SUBJECT = "/images/nafiz-2400.webp"
const SKY_SM = "/images/sky2-1400.webp"
const SUBJECT_SM = "/images/nafiz-1400.webp"

// PLACEHOLDER copy: confirm role, location and wording with Nafiz.
const WORDS = ["feel like cinema.", "make people stop.", "sell the story."]

/** A shot is a 1/CROP scale copy of the three photo layers, offset so the click is centred. */
type Shot = {
  id: number
  tc: string
  stage: { x: number; y: number; w: number; h: number }
  name: { x: number; y: number; size: number }
  from: { x: number; y: number }
  tilt: number
}

const THUMB_W = 132
const THUMB_H = 88
const CROP = 3 // the shot frames a 396×264 px area around the click

export function Hero() {
  const hero = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const roll = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLDivElement>(null)
  const tcRef = useRef<HTMLSpanElement>(null)
  const reticle = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)
  const [shots, setShots] = useState<Shot[]>([])
  const [count, setCount] = useState(0)
  const [snap, setSnap] = useState(0)
  const [word, setWord] = useState(0)
  const [aiming, setAiming] = useState(false)

  // Pointer (-1..1) drives the parallax; scroll progress drives the exit.
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 50, damping: 18 })
  const sy = useSpring(py, { stiffness: 50, damping: 18 })
  const { scrollYProgress: s } = useScroll({ target: hero, offset: ["start start", "end start"] })

  const skyX = useTransform(sx, (v) => -v * 16)
  const skyY = useTransform([sy, s], ([p, k]: number[]) => -p * 10 + k * 160)
  const nameX = useTransform(sx, (v) => -v * 30)
  const nameY = useTransform([sy, s], ([p, k]: number[]) => -p * 14 + k * 300)
  const nameOpacity = useTransform(s, [0, 0.7], [1, 0])
  const subX = useTransform(sx, (v) => v * 6)
  const subY = useTransform(s, (k) => k * 70)
  const subScale = useTransform(s, [0, 1], [1, 1.08])
  const copyY = useTransform(s, (k) => -k * 120)
  const copyOpacity = useTransform(s, [0, 0.5], [1, 0])

  // Lightning: 0..1, brightens the sky and lights a glow behind him.
  const flash = useMotionValue(0)
  const skyFilter = useTransform(flash, (f) => `brightness(${1 + f * 0.85}) contrast(${1 + f * 0.15})`)
  const [bolt, setBolt] = useState({ x: 55, y: 18 })

  const strike = useCallback(() => {
    setBolt({ x: 30 + Math.random() * 45, y: 8 + Math.random() * 22 })
    const seq = [0.9, 0.15, 0.7, 0]
    const times = [0, 90, 160, 520]
    seq.forEach((v, i) => setTimeout(() => flash.set(v), times[i]))
    // Ease the last step out instead of snapping off.
    setTimeout(() => {
      const t0 = performance.now()
      const fade = (now: number) => {
        const k = Math.min(1, (now - t0) / 700)
        flash.set(0.7 * (1 - k) * (1 - k))
        if (k < 1) requestAnimationFrame(fade)
      }
      requestAnimationFrame(fade)
    }, 160)
  }, [flash])

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let t: ReturnType<typeof setTimeout>
    const loop = (delay: number) => {
      t = setTimeout(() => {
        if (document.visibilityState === "visible" && window.scrollY < window.innerHeight) strike()
        loop(7000 + Math.random() * 7000)
      }, delay)
    }
    loop(1800)
    return () => clearTimeout(t)
  }, [strike])

  // Pause per-frame work once the hero is off-screen.
  useEffect(() => {
    const el = hero.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Running REC timecode, written straight to the DOM.
  useEffect(() => {
    let id = 0
    const tick = () => {
      if (tcRef.current) tcRef.current.textContent = timecode(recElapsed())
      id = requestAnimationFrame(tick)
    }
    if (inView) id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [inView])

  useEffect(() => {
    const id = setInterval(() => setWord((w) => (w + 1) % WORDS.length), 2800)
    return () => clearInterval(id)
  }, [])

  const onMove = (e: React.PointerEvent) => {
    const r = hero.current!.getBoundingClientRect()
    px.set(((e.clientX - r.left) / r.width) * 2 - 1)
    py.set(((e.clientY - r.top) / r.height) * 2 - 1)
    if (e.pointerType !== "mouse") return
    const overUi = !!(e.target as HTMLElement).closest("a,button,[data-ui]")
    setAiming(!overUi)
    if (reticle.current) {
      reticle.current.style.transform = `translate3d(${e.clientX - r.left}px, ${e.clientY - r.top}px, 0)`
    }
  }

  const shoot = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a,button,[data-ui]")) return
    const r = hero.current!.getBoundingClientRect()
    const st = stage.current!.getBoundingClientRect()
    const cx = e.clientX
    const cy = e.clientY
    const nr = nameRef.current!.getBoundingClientRect()
    // Top-left of the framed area; every layer is placed relative to it at 1/CROP scale.
    const fx = cx - (THUMB_W * CROP) / 2
    const fy = cy - (THUMB_H * CROP) / 2
    const shot: Shot = {
      id: Date.now(),
      tc: tcRef.current?.textContent ?? "",
      stage: { x: (st.left - fx) / CROP, y: (st.top - fy) / CROP, w: st.width / CROP, h: st.height / CROP },
      name: { x: (nr.left - fx) / CROP, y: (nr.top - fy) / CROP, size: parseFloat(getComputedStyle(nameRef.current!).fontSize) / CROP },
      from: { x: cx - r.left, y: cy - r.top },
      tilt: Math.random() * 12 - 6,
    }
    setShots((list) => [...list.slice(-4), shot])
    setCount((c) => c + 1)
    setSnap((n) => n + 1)
  }

  return (
    <section
      id="top"
      ref={hero}
      onPointerMove={onMove}
      onPointerLeave={() => setAiming(false)}
      onClick={shoot}
      className={`relative h-svh min-h-[620px] overflow-hidden bg-storm-900 select-none ${aiming ? "md:cursor-none" : ""}`}
      aria-label="Introduction"
    >
      {/* Layer 1: storm sky */}
      <motion.div className="absolute inset-0" style={{ x: skyX, y: skyY }}>
        <div className="hero-stage" style={{ transform: "scale(1.06)", transformOrigin: "50% 100%" }}>
          {/* Opening: the sky settles from a slow zoom, then keeps a very slow Ken Burns drift. */}
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.16 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "55% 40%" }}
          >
            <motion.img
              src={SKY}
              srcSet={`${SKY_SM} 1400w, ${SKY} 2400w`}
              sizes="(max-width: 767px) 1700px, 100vw"
              alt=""
              fetchPriority="high"
              className="absolute inset-0 size-full"
              style={{ filter: skyFilter, animation: "sky-drift 40s ease-in-out 3s infinite alternate" }}
            />
          </motion.div>
          {/* Lightning glow, behind him so it rims his hair. */}
          <motion.div
            aria-hidden
            className="absolute inset-0 mix-blend-screen"
            style={{
              opacity: flash,
              background: `radial-gradient(38% 46% at ${bolt.x}% ${bolt.y}%, rgb(214 236 255 / 0.85), rgb(160 200 230 / 0.25) 45%, transparent 75%)`,
            }}
          />
        </div>
      </motion.div>

      {/* Layer 2: giant name, behind the subject */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ x: nameX, y: nameY, opacity: nameOpacity }}>
        <div className="hero-stage">
          <HeroName nameRef={nameRef} flash={flash} active={inView} />
        </div>
      </motion.div>

      {/* Layer 3: Nafiz */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ x: subX, y: subY, scale: subScale, transformOrigin: "50% 100%" }}>
        <div className="hero-stage" ref={stage}>
          {/* Rack focus in: rises out of blur into sharp focus, then breathes gently. */}
          <motion.div
            className="absolute inset-0"
            initial={{ y: 50, filter: "blur(14px)", opacity: 0 }}
            animate={{ y: 0, filter: "blur(0px)", opacity: 1, transitionEnd: { filter: "none" } }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
          >
            <img
              src={SUBJECT}
              srcSet={`${SUBJECT_SM} 1400w, ${SUBJECT} 2400w`}
              sizes="(max-width: 767px) 1700px, 100vw"
              alt="Nafiz holding a mirrorless camera under a stormy sky"
              fetchPriority="high"
              className="absolute inset-0 size-full"
              style={{ animation: "breathe 7s ease-in-out 2s infinite", transformOrigin: "48% 100%" }}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Layer 4: foreground rain + washes that keep the copy readable */}
      <HeroRain active={inView} className="pointer-events-none absolute inset-0 size-full" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-storm-950 via-storm-950/70 to-transparent md:h-[38%] md:via-storm-950/40" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-gradient-to-l from-storm-950/55 to-transparent md:block" />

      {/* Shutter flash */}
      <AnimatePresence>
        {snap > 0 && (
          <motion.div
            key={snap}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 bg-white"
            initial={{ opacity: 0.75 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Viewfinder HUD */}
      <div aria-hidden className="pointer-events-none absolute inset-3 z-20 md:inset-6">
        {/* Corners snap in from further inside the frame, like a viewfinder locking on. */}
        {[
          { c: "left-0 top-0 border-l border-t", x: 40, y: 30 },
          { c: "right-0 top-0 border-r border-t", x: -40, y: 30 },
          { c: "left-0 bottom-0 border-l border-b", x: 40, y: -30 },
          { c: "right-0 bottom-0 border-r border-b", x: -40, y: -30 },
        ].map(({ c, x, y }, i) => (
          <motion.span
            key={c}
            className={`absolute size-6 border-paper/40 md:size-9 ${c}`}
            initial={{ x, y, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.9 + i * 0.05 }}
          />
        ))}
      </div>
      <motion.div
        className="pointer-events-none absolute inset-x-6 top-[84px] z-20 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-paper/75 md:inset-x-12 md:top-auto md:bottom-[34px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.05 }}
      >
        <span className="flex items-center gap-2">
          <motion.span
            className="size-2 rounded-full bg-[#ff4b3e]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 12, delay: 1.2 }}
            style={{ animation: "rec-blink 1.2s steps(1) 1.6s infinite", boxShadow: "0 0 10px #ff4b3e" }}
          />
          <Scramble text="Rec" delay={1.1} duration={0.4} /> <span ref={tcRef} className="tabular-nums text-paper">00:00:00:00</span>
        </span>
        <Scramble className="hidden md:inline" text="ISO 400 · 1/250 · f/1.8 · 4K 24p" delay={1.2} duration={1} />
        <span className="md:hidden">{count === 0 ? <Scramble text="Tap to shoot" delay={1.2} duration={0.7} /> : `${String(count).padStart(2, "0")} shots`}</span>
      </motion.div>

      {/* Copy */}
      <motion.div
        style={{ y: copyY, opacity: copyOpacity }}
        className="absolute inset-x-5 bottom-8 z-20 md:inset-x-auto md:bottom-[13%] md:right-[4vw] md:w-[min(410px,27vw)]"
      >
        <motion.p
          className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-sun"
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: 1, ease: [0.65, 0, 0.35, 1], delay: 1.25 }}
        >
          <span className="h-px w-6 bg-sun" />
          Filmmaker · Editor · Designer
        </motion.p>
        <p className="mt-3 text-[26px] font-medium leading-[1.12] tracking-tight text-paper md:text-[clamp(24px,2.1vw,34px)]">
          <SplitWords text="I shoot, cut and design stories that" delay={1.35} />
          <motion.span
            className="relative inline-grid align-bottom"
            initial={{ opacity: 0, filter: "blur(8px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 1.9 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={WORDS[word]}
                className="col-start-1 row-start-1 whitespace-nowrap font-serif italic text-sun"
                initial={{ y: "60%", opacity: 0, filter: "blur(6px)" }}
                animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
                exit={{ y: "-60%", opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                {WORDS[word]}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        </p>
        <div className="mt-6 flex gap-3" data-ui>
          {[
            { href: "#work", label: "See my work", primary: true },
            { href: "#contact", label: "Book a shoot", primary: false },
          ].map((b, i) => (
            <motion.div
              key={b.href}
              className="flex flex-1 md:flex-none"
              initial={{ y: 30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 16, delay: 2.05 + i * 0.1 }}
            >
              <Magnetic className="flex flex-1" strength={0.25}>
                <a
                  href={b.href}
                  className={`group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-full px-5 py-3.5 text-sm transition-transform hover:scale-[1.03] ${
                    b.primary ? "bg-sun font-semibold text-storm-950" : "glass font-medium text-paper"
                  }`}
                >
                  {b.primary && <span aria-hidden className="btn-shine" />}
                  <span className="relative">{b.label}</span>
                  {b.primary ? (
                    <ArrowDown className="relative size-4" style={{ animation: "nudge-down 2.4s ease-in-out 3s infinite" }} />
                  ) : (
                    <ArrowUpRight className="relative size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  )}
                </a>
              </Magnetic>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Film roll of the visitor's shots */}
      <motion.div
        ref={roll}
        data-ui
        className="absolute bottom-[13%] left-[4vw] z-20 hidden md:block"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 2.3 }}
      >
        <div className="relative h-[100px] w-[220px]">
          {shots.map((shot, i) => (
            <ShotThumb key={shot.id} shot={shot} index={i} total={shots.length} roll={roll} hero={hero} />
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/70">
          <Camera className="size-3.5" style={{ animation: "shutter-blink 4s ease-in-out 3s infinite" }} />
          {count === 0 ? (
            <span style={{ animation: "hint-bob 2.4s ease-in-out infinite" }}>Click anywhere to take a shot</span>
          ) : (
            <span>
              <span className="tabular-nums text-paper">{String(count).padStart(2, "0")}</span> shots on the roll
            </span>
          )}
        </p>
      </motion.div>

      <Letterbox />

      {/* Focus reticle that follows the mouse */}
      <div
        ref={reticle}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-40 hidden md:block"
        style={{ opacity: aiming ? 1 : 0, transition: "opacity 0.2s" }}
      >
        <motion.div
          key={snap}
          className="relative -ml-[42px] -mt-[30px] h-[60px] w-[84px]"
          initial={{ scale: 0.82 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 14 }}
        >
          {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
            <span key={c} className={`absolute size-3 border-sun ${c}`} />
          ))}
          <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun" />
        </motion.div>
      </div>
    </section>
  )
}

function ShotThumb({
  shot,
  index,
  total,
  roll,
  hero,
}: {
  shot: Shot
  index: number
  total: number
  roll: React.RefObject<HTMLDivElement | null>
  hero: React.RefObject<HTMLElement | null>
}) {
  // Start where the visitor clicked (relative to the roll), then settle into a fanned stack.
  const [from] = useState(() => {
    const rr = roll.current?.getBoundingClientRect()
    const hr = hero.current?.getBoundingClientRect()
    if (!rr || !hr) return { x: 0, y: 0 }
    return { x: shot.from.x - (rr.left - hr.left) - THUMB_W / 2, y: shot.from.y - (rr.top - hr.top) - THUMB_H / 2 }
  })
  const depth = total - 1 - index
  return (
    <motion.div
      className="absolute left-0 top-0 rounded-[3px] bg-paper p-1 pb-4 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]"
      style={{ zIndex: index }}
      initial={{ x: from.x, y: from.y, scale: 2.4, rotate: 0, opacity: 0 }}
      animate={{ x: index * 18, y: depth * 2, scale: 1 - depth * 0.03, rotate: shot.tilt, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 18, opacity: { duration: 0.2 } }}
    >
      <div className="relative overflow-hidden bg-storm-600" style={{ width: THUMB_W, height: THUMB_H }}>
        <img src={SKY_SM} alt="" className="absolute max-w-none" style={{ left: shot.stage.x, top: shot.stage.y, width: shot.stage.w, height: shot.stage.h }} />
        <span
          className="hero-face absolute font-display uppercase leading-[0.82] tracking-[-0.01em] whitespace-nowrap"
          style={{ left: shot.name.x, top: shot.name.y, fontSize: shot.name.size }}
        >
          Nafiz
        </span>
        <img src={SUBJECT_SM} alt="" className="absolute max-w-none" style={{ left: shot.stage.x, top: shot.stage.y, width: shot.stage.w, height: shot.stage.h }} />
      </div>
      <span className="absolute bottom-0.5 left-1.5 font-mono text-[8px] tracking-wider text-storm-800">{shot.tc}</span>
    </motion.div>
  )
}
