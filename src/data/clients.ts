// Client work, from Nafiz's Wistia folders "Full Production long" (o39tugxl2h) and "Reels" (g4ufws66if),
// plus the shared reel l33huzlxf3rvf86 (media 8yqngc4v2g).
// Titles are descriptive working titles from what's on screen. Confirm client names and add them as
// `client` (only Swarnali Jewellers is named, because it's visible in the film).
// Preview loops and posters: /public/work/clients/<id>.mp4|.webp. The players stream `src` (Wistia).
// The first entry of each list is what loads first in its player.

export type ClientClip = {
  id: string
  title: string
  aspect: "16:9" | "9:16" | "4:3" | "1:1"
  /** seconds */
  duration: number
  /** Full video */
  src: string
  client?: string
  credit?: string
}

/** Left player: long-form brand films. */
export const LONG_FORM: ClientClip[] = [
  {"id": "fd4u5bva5i", "title": "Swarnali Jewellers · Store film", "aspect": "16:9", "duration": 85, "src": "https://embed-ssl.wistia.com/deliveries/d03ec90156bfb8799472df6f05376a956764b956.mp4", "client": "Swarnali Jewellers"},
  {"id": "y0i51ckr4z", "title": "Hotel · Rooms & hospitality", "aspect": "16:9", "duration": 79, "src": "https://embed-ssl.wistia.com/deliveries/0001255ce077d5d418f13d9ea11a0ba81f547606.mp4"},
  {"id": "ryeez3qpqj", "title": "River escape · Houseboat film", "aspect": "16:9", "duration": 68, "src": "https://embed-ssl.wistia.com/deliveries/e6261457f80624fd5e2c8c22d4ba0fca0a8142ec.mp4"},
  {"id": "b8nmvj67eb", "title": "Houseboat · Cabins & deck pool", "aspect": "16:9", "duration": 102, "src": "https://embed-ssl.wistia.com/deliveries/7e17dff4a4c2f21bb121c6c47028d9597f4a3c35.mp4"},
  {"id": "xxdu1q1zg5", "title": "Boat house · Cuisine & rain", "aspect": "16:9", "duration": 58, "src": "https://embed-ssl.wistia.com/deliveries/296fe1fcb6cf83aadfe117c66631581bb4283798.mp4"},
  {"id": "8qhrt7gst3", "title": "Hotel · Arrival film", "aspect": "16:9", "duration": 81, "src": "https://embed-ssl.wistia.com/deliveries/4415cd2d13df6a3fdc2659c5afbdb855ff382bbb.mp4"},
  {"id": "cp4gqas4iu", "title": "Houseboat · Teaser cut", "aspect": "16:9", "duration": 37, "src": "https://embed-ssl.wistia.com/deliveries/6226ba9f1a4a93cba2527e84f54828652fbd24e5.mp4"},
]

/** Right player: reels (vertical, square and short-form). */
export const REELS: ClientClip[] = [
  {"id": "g5k8m3r16g", "title": "Talking head · Motion captions", "aspect": "9:16", "duration": 25, "src": "https://embed-ssl.wistia.com/deliveries/0b34d1cdd653f9e4c45ebe2140608a3f5ce4df4b.mp4"},
  {"id": "8yqngc4v2g", "title": "Restaurant · Food & drinks reel", "aspect": "1:1", "duration": 22, "src": "https://embed-ssl.wistia.com/deliveries/7e3fb829a4f442072b099507c71d48eb3d9cc083.mp4"},
  {"id": "jk10uan9fu", "title": "Business explainer · Bangla", "aspect": "9:16", "duration": 71, "src": "https://embed-ssl.wistia.com/deliveries/a899ca35a76071d6b0b3e4ae271b1a809ab3bc45.mp4"},
  {"id": "a6zlhn3hq6", "title": "Talking head · Follow-up tips", "aspect": "9:16", "duration": 57, "src": "https://embed-ssl.wistia.com/deliveries/1cc841da6445af38f16bd2b84236f8add85c0d0e.mp4"},
  {"id": "c115v9lsp4", "title": "Cinematic narrative edit", "aspect": "9:16", "duration": 62, "src": "https://embed-ssl.wistia.com/deliveries/f95c5dc76af30ab7b88f9edf66ab64e36fb0e5d6.mp4"},
  {"id": "xw864z3khg", "title": "Kinetic type explainer", "aspect": "9:16", "duration": 23, "src": "https://embed-ssl.wistia.com/deliveries/a1e36d70e626d4502f3bfd177172ec31e921f76f.mp4"},
  {"id": "l4wwadgdkj", "title": "“Over It” · Animated lyric video", "aspect": "4:3", "duration": 20, "src": "https://embed-ssl.wistia.com/deliveries/c5df8d42b14a8918a7e26e40b0df697d60c0923d.mp4", "credit": "Music: Citizen the Artist"},
  {"id": "a2ok9iwbno", "title": "Creator intro edit", "aspect": "9:16", "duration": 15, "src": "https://embed-ssl.wistia.com/deliveries/4201e6ba5f342090619aae2f3c41dc75680b21c9.mp4"},
]

export const previewOf = (c: ClientClip) => `/work/clients/${c.id}.mp4`
export const posterOf = (c: ClientClip) => `/work/clients/${c.id}.webp`
