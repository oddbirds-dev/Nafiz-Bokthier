"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { Magnetic } from "./motion-bits"

const LINKS = [
  { href: "#work", label: "Work" },
  { href: "#clients", label: "Clients" },
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Contact" },
]

const drop = (delay: number) => ({
  initial: { y: -28, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { type: "spring" as const, stiffness: 160, damping: 18, delay },
})

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [hover, setHover] = useState<string | null>(null)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 md:pt-6">
      <nav
        className={`mx-auto flex max-w-[1500px] items-center justify-between rounded-full py-2 pl-5 pr-2 transition-all duration-500 ${
          scrolled ? "glass" : "border border-transparent"
        }`}
      >
        <motion.a {...drop(0.7)} href="#top" className="font-display text-2xl uppercase leading-none tracking-wide text-paper">
          Nafiz
          <motion.span
            className="inline-block text-sun"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 10, delay: 1.1 }}
          >
            .
          </motion.span>
        </motion.a>
        <motion.ul
          {...drop(0.8)}
          onPointerLeave={() => setHover(null)}
          className={`hidden items-center gap-1 rounded-full p-1 md:flex ${scrolled ? "border border-transparent" : "glass"}`}
        >
          {LINKS.map((l, i) => (
            <motion.li key={l.href} {...drop(0.85 + i * 0.05)} className="relative">
              {hover === l.href && (
                <motion.span
                  layoutId="nav-hover"
                  className="absolute inset-0 rounded-full bg-white/12"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <a
                href={l.href}
                onPointerEnter={() => setHover(l.href)}
                className="relative block rounded-full px-4 py-2 text-sm text-paper/80 transition-colors hover:text-paper"
              >
                {l.label}
              </a>
            </motion.li>
          ))}
        </motion.ul>
        <motion.div {...drop(0.95)}>
          <Magnetic strength={0.2}>
            <a
              href="#contact"
              className="group flex items-center gap-2 rounded-full bg-paper py-2.5 pl-5 pr-2.5 text-sm font-medium text-storm-950 transition-transform hover:scale-[1.03]"
            >
              Let&apos;s talk
              <span className="grid size-7 place-items-center rounded-full bg-storm-950 text-paper transition-transform duration-300 group-hover:rotate-45">
                <ArrowUpRight className="size-4" />
              </span>
            </a>
          </Magnetic>
        </motion.div>
      </nav>
    </header>
  )
}
