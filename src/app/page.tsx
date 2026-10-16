import { Hero } from "@/components/hero"
import { Nav } from "@/components/nav"
import { WorkTimeline } from "@/components/work-timeline"
import { PERSONAL } from "@/data/work"
import { ClientWork } from "@/components/client-work"
import { AboutFocus } from "@/components/about-focus"
import { ServicesRender } from "@/components/services-render"
import { ContactSlate } from "@/components/contact-slate"
import { EndCredits } from "@/components/end-credits"

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <WorkTimeline reel={PERSONAL} />
      <ClientWork />
      <AboutFocus />
      <ServicesRender />
      <ContactSlate />
      <EndCredits />
    </main>
  )
}
