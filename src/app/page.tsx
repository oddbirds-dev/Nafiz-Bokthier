import { Hero } from "@/components/hero"
import { Nav } from "@/components/nav"
import { WorkTimeline } from "@/components/work-timeline"
import { PERSONAL } from "@/data/work"
import { ControlRoom } from "@/components/control-room"

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <WorkTimeline reel={PERSONAL} />
      <ControlRoom />
      <section id="about" className="grid min-h-[60svh] place-items-center bg-storm-950 text-storm-400">
        <p className="font-mono text-xs uppercase tracking-[0.3em]">About — coming next</p>
      </section>
    </main>
  )
}
