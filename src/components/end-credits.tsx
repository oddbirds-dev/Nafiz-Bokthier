"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion"
import { ArrowUpRight, RotateCcw } from "lucide-react"

const CREDITS: [string, string][] = [
  ["Directed by", "Nafiz Bokthier"],
  ["Edited by", "Nafiz Bokthier"],
  ["Colour", "Nafiz Bokthier"],
  ["Sound design", "Nafiz Bokthier"],
  ["Motion graphics", "Nafiz Bokthier"],
  ["Languages", "Bangla · English"],
  ["Shot on location in", "Bangladesh"],
  ["Catering", "MasterChef Nafiz"],
]

const SOCIALS = [
  { label: "YouTube", handle: "@NafizBokthier", href: "https://www.youtube.com/@NafizBokthier" },
  { label: "Instagram", handle: "@nafizbokthier", href: "https://www.instagram.com/nafizbokthier/" },
  { label: "Direct message", handle: "ig.me/m/nafizbokthier", href: "https://ig.me/m/nafizbokthier" },
]

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * End credits. The footer is a tall scroll track with a pinned "screen": as you scroll, the credit
 * roll moves up through it and comes to rest on the final title card.
 */
export function EndCredits() {
  const track = useRef<HTMLElement>(null)
  const roll = useRef<HTMLDivElement>(null)
  const rm = useReducedMotion()
  const inView = useInView(track)
  const [dims, setDims] = useState({ roll: 0, vh: 0 })
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => setYear(new Date().getFullYear()), [])

  useIso(() => {
    const measure = () => setDims({ roll: roll.current?.offsetHeight ?? 0, vh: window.innerHeight })
    measure()
    const ro = new ResizeObserver(measure)
    if (roll.current) ro.observe(roll.current)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  const { scrollYProgress } = useScroll({ target: track, offset: ["start end", "end end"] })
  // From "first credit rising into the bottom of the screen" to "final card filling the screen".
  // The pinned screen only sticks once the track reaches the top, so the first vh of scroll moves
  // it naturally; the roll starts slightly inset so credits are visible as the footer arrives.
  const start = dims.vh * 0.18
  const end = -(dims.roll - dims.vh)
  const y = useTransform(scrollYProgress, (p) => (dims.roll ? start + (end - start) * p : 0))
  const reelTurn = useTransform(scrollYProgress, [0, 1], [0, 220])

  const pinned = !rm && dims.roll > 0
  const trackH = pinned ? dims.roll + dims.vh * 0.25 : undefined

  function rewind() {
    const lenis = (window as Window & { __lenis?: { scrollTo(t: string | number, o?: object): void } }).__lenis
    const top = document.getElementById("top")
    if (lenis) lenis.scrollTo(top ? "#top" : 0, { duration: rm ? 0 : 2.4, easing: (t: number) => 1 - Math.pow(1 - t, 4) })
    else (top ?? document.documentElement).scrollIntoView({ behavior: rm ? "auto" : "smooth" })
  }

  return (
    <footer
      ref={track}
      id="credits"
      className="relative border-t border-white/5 bg-storm-950"
      style={{ height: trackH }}
    >
      <div className={pinned ? "sticky top-0 h-svh overflow-hidden" : "relative overflow-hidden"}>
        {/* film reel in the background */}
        <Reel turn={reelTurn} spinning={inView && !rm} />
        {/* vignette top/bottom so credits fade in and out like a projection */}
        {pinned && (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[18svh] bg-gradient-to-b from-storm-950 to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[6svh] bg-gradient-to-t from-storm-950/60 to-transparent" />
          </>
        )}

        <motion.div ref={roll} style={pinned ? { y } : undefined} className="relative z-[5] px-4 md:px-8">
          {/* credits */}
          <div className="mx-auto max-w-[900px] pb-[2svh] pt-[10svh]">
            <p className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-sun">End credits</p>
            <p className="mt-3 text-center font-serif text-[clamp(26px,3.4vw,40px)] italic leading-tight text-storm-200">
              A portfolio by Nafiz Bokthier
            </p>

            <dl className="mt-[9svh] space-y-[clamp(22px,4.2svh,40px)]">
              {CREDITS.map(([role, name]) => (
                <div key={role} className="grid grid-cols-1 items-baseline gap-1 text-center md:grid-cols-[1fr_auto_1fr] md:gap-6">
                  <dt className="font-mono text-[11.5px] uppercase tracking-[0.24em] text-storm-400 md:text-right md:text-[12.5px]">{role}</dt>
                  <span aria-hidden className="hidden h-px w-10 self-center bg-white/15 md:block" />
                  <dd className="font-display text-[clamp(24px,2.6vw,34px)] uppercase leading-tight tracking-wide text-paper md:text-left">
                    {name}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mx-auto mt-[11svh] max-w-[30ch] text-center font-serif text-[clamp(22px,2.6vw,32px)] italic leading-snug text-storm-200">
              &ldquo;They call me MasterChef, because I always cook.&rdquo;
            </p>

            <div className="mt-[11svh]">
              <p className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-storm-400">Follow the production</p>
              <ul className="mx-auto mt-6 grid max-w-[640px] gap-3 sm:grid-cols-3">
                {SOCIALS.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex min-h-[72px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center transition-colors hover:border-sun/50"
                    >
                      <span className="inline-flex items-center gap-1 font-display text-[20px] uppercase tracking-wide text-paper group-hover:text-sun">
                        {s.label}
                        <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                      <span className="mt-0.5 font-mono text-[11px] text-storm-400">{s.handle}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* final card */}
          <div className="relative mx-auto flex min-h-svh max-w-[1500px] flex-col items-center justify-center pb-[max(28px,env(safe-area-inset-bottom))] pt-[96px] text-center">
            <h2 className="relative font-display text-[clamp(110px,33vw,150px)] md:text-[clamp(150px,24vw,340px)] uppercase leading-[0.82] tracking-[-0.01em] text-paper">
              Nafiz
              <span className="absolute -bottom-[0.06em] right-[-0.08em] translate-x-[30%] font-serif text-[0.34em] normal-case italic leading-none tracking-normal text-sun">
                Fin.
              </span>
            </h2>
            <p className="mt-[clamp(28px,5svh,52px)] font-mono text-[11px] uppercase tracking-[0.28em] text-storm-400">
              <span className="block md:inline">Video editor · Filmmaker</span><span className="hidden md:inline"> · </span><span className="mt-1.5 block md:mt-0 md:inline">Content creator — Bangladesh</span>
            </p>
            <button
              type="button"
              onClick={rewind}
              className="group mt-8 inline-flex min-h-12 items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-6 font-mono text-[12px] uppercase tracking-[0.22em] text-paper transition-colors hover:border-sun hover:text-sun"
            >
              <RotateCcw className="size-4 transition-transform duration-500 group-hover:-rotate-[300deg]" />
              Rewind to the top
            </button>
            <p className="absolute inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] font-mono text-[11px] tracking-[0.12em] text-storm-400/80">
              © {year ?? ""} Nafiz Bokthier
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}

/** 35mm reel: the generated image when it exists, otherwise a CSS-drawn reel of the same size. */
function Reel({ turn, spinning }: { turn: MotionValue<number>; spinning: boolean }) {
  const img = useRef<HTMLImageElement>(null)
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    const el = img.current
    if (el && el.complete) setOk(el.naturalWidth > 0)
  }, [])
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square w-[min(120vw,1100px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.13] md:w-[min(80vw,1000px)]"
      style={{ rotate: turn }}
    >
      <div
        className="absolute inset-0 animate-spin"
        style={{ animationDuration: "90s", animationPlayState: spinning ? "running" : "paused" }}
      >
        {ok !== true && <CssReel />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={img}
          src="/images/gen/film-reel.webp"
          alt=""
          className={`absolute inset-0 h-full w-full object-contain ${ok ? "" : "opacity-0"}`}
          onLoad={() => setOk(true)}
          onError={() => setOk(false)}
        />
      </div>
    </motion.div>
  )
}

function CssReel() {
  const holes = Array.from({ length: 6 }, (_, i) => i * 60)
  return (
    <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, #c3d2d4 0 7%, transparent 7.3% 9%, #c3d2d4 9.3% 14%, transparent 14.3%), radial-gradient(circle, transparent 46%, #c3d2d4 46.5% 49%, transparent 49.5%)" }}>
      <div className="absolute inset-[4%] rounded-full border-[1.2vmin] border-storm-200" />
      {holes.map((a) => (
        <div
          key={a}
          className="absolute left-1/2 top-1/2 aspect-square w-[24%] rounded-full border-[0.8vmin] border-storm-200"
          style={{ transform: `translate(-50%,-50%) rotate(${a}deg) translateY(-140%)` }}
        />
      ))}
    </div>
  )
}
