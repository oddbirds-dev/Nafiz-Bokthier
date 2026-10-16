"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check } from "lucide-react"
import { recElapsed, timecode } from "@/lib/rec-clock"

// DRAFT copy: confirm with Nafiz. Every answer is built from known facts (his channel, his client
// work, his most-watched video, his Instagram bio); the wording is a proposal for him to approve.
const QA = [
  {
    q: "Who's behind the camera?",
    a: "I'm Nafiz Bokthier. A video editor, filmmaker and content creator from Bangladesh. I work in Bangla and English.",
    clip: "q1",
  },
  {
    q: "How did you learn?",
    a: "No paid course. I learned editing by making things, breaking them and making them again. Then I turned that method into my most-watched video.",
    clip: "q2",
  },
  {
    q: "What do you make?",
    a: "Brand films for jewellers, hotels, river resorts and restaurants, and reels with motion graphics and kinetic captions that stop the scroll.",
    clip: "q3",
  },
  {
    q: "What makes an edit work?",
    a: "Story first, then rhythm, then sound. A video can look perfect and still feel empty if the sound design is missing.",
    clip: "q4",
  },
  {
    q: "Why teach on YouTube?",
    a: "I break down editing, storytelling and content creation in Bangla: the things I had to figure out on my own.",
    clip: "q5",
  },
  {
    q: "And the MasterChef thing?",
    a: "They call me MasterChef, because I always cook.",
    clip: "q6",
  },
]

const HOLD = 2600 // ms the full answer stays up before the next question
const WORD = 150 // ms per word while the subtitle types on

/**
 * About as a sit-down interview. Real footage of Nafiz (muted, from his own videos) plays in a
 * framed monitor with a broadcast lower-third; pick a question from the script, or let it roll,
 * and his answer types out as cinema subtitles while the shot cuts to the next clip.
 */
export function AboutInterview() {
  const section = useRef<HTMLElement>(null)
  const [live, setLive] = useState(false)
  const [i, setI] = useState(0)
  const [words, setWords] = useState(0)
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]))
  const [reduced, setReduced] = useState(false)
  const tcRef = useRef<HTMLSpanElement>(null)
  const timer = useRef(0)

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    const el = section.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const total = QA[i].a.split(" ").length

  // Type the answer on word by word, hold, then move to the next question (only while on screen).
  useEffect(() => {
    if (!live) return
    clearTimeout(timer.current)
    if (reduced) {
      setWords(total)
      return
    }
    if (words < total) timer.current = window.setTimeout(() => setWords((w) => w + 1), WORD)
    else timer.current = window.setTimeout(() => go((i + 1) % QA.length), HOLD)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, words, i, reduced])

  // REC timecode on the monitor, from the page-wide clock.
  useEffect(() => {
    if (!live) return
    let id = 0
    const tick = () => {
      if (tcRef.current) tcRef.current.textContent = timecode(recElapsed())
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [live])

  const go = (n: number) => {
    setI(n)
    setWords(0)
    setSeen((s) => new Set(s).add(n))
  }

  const answer = QA[i].a.split(" ")
  const progress = Math.min(1, words / total)

  return (
    <section
      ref={section}
      id="about"
      aria-label="About"
      className="relative flex flex-col overflow-hidden border-t border-white/5 bg-storm-950 px-4 pb-12 pt-[88px] md:h-svh md:min-h-[720px] md:px-8 md:pb-8 md:pt-[100px]"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-sun">04 · About</p>
          <h2 className="mt-1 font-display text-[clamp(38px,5vw,72px)] uppercase leading-[0.9] text-paper">
            The <span className="font-serif normal-case italic text-sun">interview</span>
          </h2>
        </div>
        <p className="hidden max-w-[280px] text-right text-[13px] leading-snug text-storm-400 md:block">
          Pick a question, or let it roll. Footage from my own videos.
        </p>
      </div>

      <div className="relative mt-5 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] md:gap-7">
        {/* Monitor */}
        <div className="relative flex min-h-0 min-w-0 items-center">
          <div className="relative aspect-video max-h-full w-full overflow-hidden rounded-2xl bg-black shadow-[0_0_0_1px_rgb(255_255_255/0.1),0_40px_80px_-30px_rgb(0_0_0/0.9)] md:mx-auto md:w-auto md:max-w-full md:[height:100%]">
            <AnimatePresence initial={false}>
              <motion.div
                key={QA[i].clip}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <video
                  src={live ? `/work/about/${QA[i].clip}.mp4` : undefined}
                  poster={`/work/about/${QA[i].clip}.webp`}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="absolute inset-0 size-full object-cover"
                />
              </motion.div>
            </AnimatePresence>

            {/* Grade + vignette so the overlays read */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgb(0_0_0/0.55))]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />

            {/* Viewfinder HUD */}
            <div className="pointer-events-none absolute inset-3 md:inset-4">
              {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
                <span key={c} className={`absolute size-5 border-paper/50 md:size-7 ${c}`} />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-5 top-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-paper/85 md:inset-x-7 md:top-6 md:text-[11px]">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#ff4b3e] shadow-[0_0_8px_#ff4b3e]" style={{ animation: "rec-blink 1.2s steps(1) infinite" }} />
                Rec <span ref={tcRef} className="tabular-nums text-paper">00:00:00:00</span>
              </span>
              <span className="hidden sm:inline">Int. Studio · Night · Q{i + 1}</span>
            </div>

            {/* Lower third */}
            <motion.div
              className="pointer-events-none absolute left-5 top-[22%] hidden md:left-7 md:block"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            >
              <div className="flex items-stretch">
                <span className="w-1.5 bg-sun" />
                <div className="bg-storm-950/80 px-4 py-2.5 backdrop-blur">
                  <p className="font-display text-[clamp(18px,1.9vw,30px)] uppercase leading-none text-paper">Nafiz Bokthier</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-sun">Video editor · Filmmaker · Bangladesh</p>
                </div>
              </div>
            </motion.div>

            {/* Subtitles (desktop): the answer types on, cinema style */}
            <div className="pointer-events-none absolute inset-x-[6%] bottom-[9%] hidden justify-center md:flex" aria-live="polite">
              <p className="max-w-[46ch] text-center text-[clamp(16px,1.55vw,24px)] font-medium leading-snug text-paper [text-shadow:0_2px_12px_rgb(0_0_0/0.9)]">
                {answer.map((w, k) => (
                  <span key={`${i}-${k}`} className="transition-[opacity,filter] duration-300" style={{ opacity: k < words ? 1 : 0, filter: k < words ? "none" : "blur(4px)" }}>
                    {w}{" "}
                  </span>
                ))}
              </p>
            </div>

            {/* Answer progress */}
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
              <div className="h-full origin-left bg-sun transition-transform duration-150" style={{ transform: `scaleX(${progress})` }} />
            </div>
          </div>

          {/* The camera filming the interview: a foreground prop, gently floating */}
          <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-16 hidden w-[min(34vw,460px)] -scale-x-100 lg:block">
            <img
              src="/images/gen/cine-camera.webp"
              alt=""
              className="w-full drop-shadow-[0_30px_40px_rgb(0_0_0/0.8)]"
              style={{ animation: "breathe 8s ease-in-out infinite" }}
            />
          </div>
        </div>

        {/* Mobile: the answer below the frame, readable */}
        <div className="md:hidden" aria-live="polite">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-sun">Q{i + 1} · {QA[i].q}</p>
          <p className="mt-2 min-h-[4.5em] text-[18px] font-medium leading-snug text-paper">
            {answer.map((w, k) => (
              <span key={`${i}-${k}`} className="transition-opacity duration-300" style={{ opacity: k < words ? 1 : 0.15 }}>
                {w}{" "}
              </span>
            ))}
          </p>
        </div>

        {/* Interview script */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-white/10 bg-storm-900/60 p-4 md:p-5">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-storm-400">
            <span>Interview script</span>
            <span>
              {String(i + 1).padStart(2, "0")}/{String(QA.length).padStart(2, "0")}
            </span>
          </div>
          <ol className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:block md:space-y-1.5 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
            {QA.map((item, k) => {
              const on = k === i
              const done = seen.has(k) && !on
              return (
                <li key={item.q} className="shrink-0 snap-start">
                  <button
                    type="button"
                    onClick={() => go(k)}
                    aria-current={on}
                    className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors md:py-3 ${
                      on ? "border-sun/60 bg-sun/10" : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full font-mono text-[10px] ${
                        on ? "bg-sun text-storm-950" : done ? "bg-white/10 text-paper/70" : "border border-white/15 text-storm-400"
                      }`}
                    >
                      {done ? <Check className="size-3.5" /> : `Q${k + 1}`}
                    </span>
                    <span className={`whitespace-nowrap text-[14px] md:whitespace-normal md:text-[15px] ${on ? "text-paper" : "text-paper/70"}`}>{item.q}</span>
                    {on && (
                      <span className="ml-auto hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#ff8a80] md:flex">
                        <span className="size-1.5 rounded-full bg-[#ff4b3e]" style={{ animation: "rec-blink 1.2s steps(1) infinite" }} /> Live
                      </span>
                    )}
                    {on && <span className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-sun/70" style={{ transform: `scaleX(${progress})` }} />}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="mt-auto hidden border-t border-white/10 pt-4 md:block">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-storm-400">In the kit</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Premiere Pro", "After Effects", "DaVinci Resolve", "Bangla + English", "Based in Bangladesh"].map((t) => (
                <span key={t} className="rounded-full border border-white/10 px-2.5 py-1 text-[12px] text-paper/80">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
