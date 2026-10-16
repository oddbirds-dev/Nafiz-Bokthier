"use client"

import { useEffect, useRef } from "react"

/** Fine wind-blown rain streaks drawn on a 2D canvas. Sits in front of Nafiz for depth. */
export function HeroRain({ active, className }: { active: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = canvas.getContext("2d")!
    let w = 0
    let h = 0
    let drops: { x: number; y: number; len: number; speed: number; alpha: number; width: number }[] = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = w < 768 ? 45 : 110
      drops = Array.from({ length: count }, () => spawn(true))
    }
    const spawn = (anywhere: boolean) => {
      // A few near drops are long, bright and fast; most are far, short and faint.
      const near = Math.random() < 0.12
      return {
        x: Math.random() * (w + 300) - 300,
        y: anywhere ? Math.random() * h : -40,
        len: near ? 26 + Math.random() * 22 : 8 + Math.random() * 12,
        speed: near ? 1300 + Math.random() * 500 : 600 + Math.random() * 400,
        alpha: near ? 0.32 : 0.1 + Math.random() * 0.12,
        width: near ? 1.4 : 0.8,
      }
    }

    resize()
    window.addEventListener("resize", resize)
    const slant = 0.22 // wind pushes the rain to the right, the way his hair blows
    let last = performance.now()
    let id = 0
    const tick = (now: number) => {
      id = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!activeRef.current) return
      ctx.clearRect(0, 0, w, h)
      ctx.lineCap = "round"
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]
        d.y += d.speed * dt
        d.x += d.speed * dt * slant
        if (d.y - d.len > h || d.x > w + 60) drops[i] = spawn(false)
        ctx.strokeStyle = `rgba(225,238,240,${d.alpha})`
        ctx.lineWidth = d.width
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.len * slant, d.y - d.len)
        ctx.stroke()
      }
    }
    id = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={className} />
}
