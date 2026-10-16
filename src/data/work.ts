// The Work timeline: Nafiz's own channel. (Client work lives in clients.ts, shown as the control room.)
// Personal: latest uploads from youtube.com/@NafizBokthier (titles, dates and view counts as published).
//   Thumbnails and 5-second muted previews live in /public/work/<id>.webp|.mp4.
// Clients: drop a thumbnail (and optionally a short muted preview .mp4) in /public/work/clients/
//   and point `video` at YouTube, Vimeo or a file in /public.

export type Track = { key: string; code: string; label: string; short: string; offset: number }

/** Where the full video plays from. Personal clips default to YouTube with their id. */
export type VideoSource = { youtube: string } | { vimeo: string } | { file: string }

export type Clip = {
  id: string
  title: string
  track: string
  kind: "long" | "short"
  /** YYYYMMDD */
  date?: string
  /** seconds */
  duration?: number
  views?: number
  vertical: boolean
  blurb?: string
  /** Defaults to /work/<id>.webp */
  thumb?: string
  /** Muted hover/monitor loop. Defaults to /work/<id>.mp4; null = none (the thumbnail is shown). */
  preview?: string | null
  /** Defaults to { youtube: id }; null = no full video yet. */
  video?: VideoSource | null
  client?: string
  /** What Nafiz did on it, e.g. "Direction · Shoot · Edit" */
  role?: string
  /** Stand-in until the real project is added; flagged in the inspector. */
  placeholder?: boolean
}

export type Reel = {
  id: string
  eyebrow: string
  title: string
  /** Top to bottom, like video tracks in an editor (the top track wins in the monitor). */
  tracks: Track[]
  clips: Clip[]
}

export const thumbOf = (c: Clip) => c.thumb ?? `/work/${c.id}.webp`
export const previewOf = (c: Clip) => (c.preview === undefined ? `/work/${c.id}.mp4` : c.preview)
export const videoOf = (c: Clip): VideoSource | null => (c.video === undefined ? { youtube: c.id } : c.video)

export function embedUrl(v: VideoSource) {
  if ("youtube" in v) return `https://www.youtube-nocookie.com/embed/${v.youtube}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
  if ("vimeo" in v) return `https://player.vimeo.com/video/${v.vimeo}?autoplay=1&dnt=1`
  return null // files play in a <video>
}

export function externalLink(v: VideoSource | null): { href: string; label: string } | null {
  if (!v) return null
  if ("youtube" in v) return { href: `https://www.youtube.com/watch?v=${v.youtube}`, label: "Open on YouTube" }
  if ("vimeo" in v) return { href: `https://vimeo.com/${v.vimeo}`, label: "Open on Vimeo" }
  return null
}

export const PERSONAL: Reel = {
  id: "work",
  eyebrow: "02 · Latest work",
  title: "The edit",
  tracks: [
    { key: "reels", code: "V3", label: "Shorts & Reels", short: "Reels", offset: 0.35 },
    { key: "craft", code: "V2", label: "Creator craft", short: "Craft", offset: 0 },
    { key: "editing", code: "V1", label: "Editing", short: "Editing", offset: 0.7 },
  ],
  clips: [
    {"id": "W82O-AijV1E", "title": "Never Do THIS as a Content Creator in 2026", "track": "craft", "kind": "long", "date": "20251231", "duration": 397, "views": 1181, "vertical": false},
    {"id": "uRPSw6fqLA8", "title": "How to shoot SOLO like a pro 2026", "track": "craft", "kind": "long", "date": "20251030", "duration": 273, "views": 1524, "vertical": false},
    {"id": "eaRN-UCKg8c", "title": "Top Creative Expert Reveals BEST Idea Generation Techniques", "track": "craft", "kind": "long", "date": "20250522", "duration": 167, "views": 9189, "vertical": false},
    {"id": "jO6xG1XQbYU", "title": "I edited everything… কিন্তু কিছু একটা মিসিং ছিল", "track": "editing", "kind": "long", "date": "20250513", "duration": 236, "views": 5569, "vertical": false, "blurb": "Are your videos looking great but feeling flat? Chances are, your sound design is missing – and that's killing your vibe."},
    {"id": "n9q_rlbwPfU", "title": "5 Essential Video Editing Techniques Every Creator Needs in 2025", "track": "editing", "kind": "long", "date": "20250423", "duration": 241, "views": 4195, "vertical": false, "blurb": "Learn about the 5 critical video editing mistakes to avoid in 2025! Whether you're using Adobe Premiere Pro or another editing software, this tutorial will help you perfect your video editing skills."},
    {"id": "OWZuJbMFIxc", "title": "This is How I Actually Learned Video Editing (কোনো পেইড কোর্স ছাড়া)", "track": "editing", "kind": "long", "date": "20250418", "duration": 393, "views": 22646, "vertical": false, "blurb": "In this video, I’m breaking down the exact method I used to learn video editing — no expensive courses, no boring playlists, just a system that actually works."},
    {"id": "41NbMs3DIKs", "title": "AI will take your job?", "track": "reels", "kind": "short", "date": "20260823", "duration": 61, "views": 149, "vertical": true, "blurb": "But when everyone can create content, creating content is no longer the advantage."},
    {"id": "Oub33tQeelg", "title": "Men and their crazy obsession with Tea", "track": "reels", "kind": "short", "date": "20260718", "duration": 32, "views": 352, "vertical": true},
    {"id": "ugvQQiLVBIg", "title": "ADHD of a Content creator", "track": "reels", "kind": "short", "date": "20260717", "duration": 43, "views": 770, "vertical": true, "blurb": "Comment if you have the same problem."},
    {"id": "QPzWvef0qPo", "title": "The Spider Cycle Every Artist Experiences", "track": "reels", "kind": "short", "date": "20260715", "duration": 37, "views": 234, "vertical": true, "blurb": "Spiderman through the lens of an Artist."},
  ],
}
