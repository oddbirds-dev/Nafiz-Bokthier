"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

const EASE = [0.22, 1, 0.36, 1] as const

/** Words rise out of a mask one after another. */
export function SplitWords({ text, delay = 0, stagger = 0.06 }: { text: string; delay?: number; stagger?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom -mb-[0.12em]">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * stagger }}
          >
            {w}
          </motion.span>
          {" "}
        </span>
      ))}
    </>
  )
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·:"

/** Camera-display text that boots up: random glyphs settle into the real characters left to right. */
export function Scramble({ text, delay = 0, duration = 0.9, className }: { text: string; delay?: number; duration?: number; className?: string }) {
  const [out, setOut] = useState(() => text.replace(/[^\s]/g, " "))
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOut(text)
      return
    }
    let id = 0
    const start = performance.now() + delay * 1000
    const tick = (now: number) => {
      const k = (now - start) / (duration * 1000)
      if (k < 0) {
        id = requestAnimationFrame(tick)
        return
      }
      const settled = Math.floor(k * text.length)
      setOut(
        text
          .split("")
          .map((c, i) => (c === " " || i < settled ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
          .join(""),
      )
      if (k < 1) id = requestAnimationFrame(tick)
      else setOut(text)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [text, delay, duration])
  return (
    <span className={className} aria-label={text}>
      {out}
    </span>
  )
}

/** Pulls its child toward the cursor while hovered (fine pointers only). */
export function Magnetic({ children, strength = 0.3, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 15 })
  const sy = useSpring(y, { stiffness: 220, damping: 15 })
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return
        const r = ref.current!.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * strength)
        y.set((e.clientY - r.top - r.height / 2) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

/** Opening shot: anamorphic letterbox bars that open up to the full frame. */
export function Letterbox() {
  return (
    <>
      {[
        "top-0 origin-top",
        "bottom-0 origin-bottom",
      ].map((c) => (
        <motion.div
          key={c}
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 z-[45] h-[14svh] bg-storm-950 ${c}`}
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 1.1, ease: [0.7, 0, 0.2, 1], delay: 0.45 }}
        />
      ))}
    </>
  )
}
