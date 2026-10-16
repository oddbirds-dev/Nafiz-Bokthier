// Client work, from Nafiz's Wistia folders "Full Production long" (o39tugxl2h) and "Reels" (g4ufws66if).
// Titles are descriptive working titles from what's on screen. Confirm client names and add them as
// `client` (only Swarnali Jewellers is named, because it's visible in the film).
// Preview loops and posters: /public/work/clients/<id>.mp4|.webp. Program plays `src` (Wistia 720p).

export type Bank = { key: "A" | "B" | "C"; label: string }

export const BANKS: Bank[] = [
  { key: "A", label: "Brand films" },
  { key: "B", label: "Creator edits" },
  { key: "C", label: "Motion" },
]

export type ClientClip = {
  id: string
  bank: Bank["key"]
  title: string
  aspect: "16:9" | "9:16" | "4:3"
  /** seconds */
  duration: number
  /** Full video for the program monitor */
  src: string
  client?: string
  credit?: string
}

export const CLIENT_CLIPS: ClientClip[] = [
  {"id": "fd4u5bva5i", "bank": "A", "title": "Swarnali Jewellers · Store film", "aspect": "16:9", "duration": 85, "src": "https://embed-ssl.wistia.com/deliveries/d03ec90156bfb8799472df6f05376a956764b956.mp4", "client": "Swarnali Jewellers"},
  {"id": "ryeez3qpqj", "bank": "A", "title": "River escape · Houseboat film", "aspect": "16:9", "duration": 68, "src": "https://embed-ssl.wistia.com/deliveries/e6261457f80624fd5e2c8c22d4ba0fca0a8142ec.mp4"},
  {"id": "b8nmvj67eb", "bank": "A", "title": "Houseboat · Cabins & deck pool", "aspect": "16:9", "duration": 102, "src": "https://embed-ssl.wistia.com/deliveries/7e17dff4a4c2f21bb121c6c47028d9597f4a3c35.mp4"},
  {"id": "xxdu1q1zg5", "bank": "A", "title": "Boat house · Cuisine & rain", "aspect": "16:9", "duration": 58, "src": "https://embed-ssl.wistia.com/deliveries/296fe1fcb6cf83aadfe117c66631581bb4283798.mp4"},
  {"id": "y0i51ckr4z", "bank": "A", "title": "Hotel · Rooms & hospitality", "aspect": "16:9", "duration": 79, "src": "https://embed-ssl.wistia.com/deliveries/0001255ce077d5d418f13d9ea11a0ba81f547606.mp4"},
  {"id": "8qhrt7gst3", "bank": "A", "title": "Hotel · Arrival film", "aspect": "16:9", "duration": 81, "src": "https://embed-ssl.wistia.com/deliveries/4415cd2d13df6a3fdc2659c5afbdb855ff382bbb.mp4"},
  {"id": "cp4gqas4iu", "bank": "A", "title": "Houseboat · Teaser cut", "aspect": "16:9", "duration": 37, "src": "https://embed-ssl.wistia.com/deliveries/6226ba9f1a4a93cba2527e84f54828652fbd24e5.mp4"},
  {"id": "jk10uan9fu", "bank": "B", "title": "Business explainer · Bangla", "aspect": "9:16", "duration": 71, "src": "https://embed-ssl.wistia.com/deliveries/a899ca35a76071d6b0b3e4ae271b1a809ab3bc45.mp4"},
  {"id": "a6zlhn3hq6", "bank": "B", "title": "Talking head · Follow-up tips", "aspect": "9:16", "duration": 57, "src": "https://embed-ssl.wistia.com/deliveries/1cc841da6445af38f16bd2b84236f8add85c0d0e.mp4"},
  {"id": "c115v9lsp4", "bank": "B", "title": "Cinematic narrative edit", "aspect": "9:16", "duration": 62, "src": "https://embed-ssl.wistia.com/deliveries/f95c5dc76af30ab7b88f9edf66ab64e36fb0e5d6.mp4"},
  {"id": "g5k8m3r16g", "bank": "B", "title": "Talking head · Motion captions", "aspect": "9:16", "duration": 25, "src": "https://embed-ssl.wistia.com/deliveries/0b34d1cdd653f9e4c45ebe2140608a3f5ce4df4b.mp4"},
  {"id": "xw864z3khg", "bank": "B", "title": "Kinetic type explainer", "aspect": "9:16", "duration": 23, "src": "https://embed-ssl.wistia.com/deliveries/a1e36d70e626d4502f3bfd177172ec31e921f76f.mp4"},
  {"id": "a2ok9iwbno", "bank": "B", "title": "Creator intro edit", "aspect": "9:16", "duration": 15, "src": "https://embed-ssl.wistia.com/deliveries/4201e6ba5f342090619aae2f3c41dc75680b21c9.mp4"},
  {"id": "l4wwadgdkj", "bank": "C", "title": "“Over It” · Animated lyric video", "aspect": "4:3", "duration": 20, "src": "https://embed-ssl.wistia.com/deliveries/c5df8d42b14a8918a7e26e40b0df697d60c0923d.mp4", "credit": "Music: Citizen the Artist"},
]

export const previewOf = (c: ClientClip) => `/work/clients/${c.id}.mp4`
export const posterOf = (c: ClientClip) => `/work/clients/${c.id}.webp`
