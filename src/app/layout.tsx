import type { Metadata, Viewport } from "next"
import { Anton, Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import { SmoothScroll } from "@/components/smooth-scroll"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-instrument" })
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" })

// PLACEHOLDER copy: confirm role and location with Nafiz.
export const metadata: Metadata = {
  title: "Nafiz | Filmmaker & Visual Storyteller",
  description: "Nafiz shoots, edits and designs stories that feel like cinema.",
}

export const viewport: Viewport = {
  themeColor: "#070d0f",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${anton.variable} ${serif.variable}`}>
      <body className="font-sans">
        <SmoothScroll />
        {children}
      </body>
    </html>
  )
}
