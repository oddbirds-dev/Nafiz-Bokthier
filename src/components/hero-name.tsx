"use client"

import { useEffect, useRef, useState, type Ref } from "react"
import { type MotionValue } from "framer-motion"

const NAME = "NAFIZ"

/**
 * The giant name, blown by the wind. The real letterforms are drawn into a texture and a small
 * WebGL shader moves them: slow horizontal turbulence ripples the shapes, the downwind (right)
 * edges smear into thin wisps, and gusts sweep through and bend the letters before they settle.
 * The cursor pushes and drags the letters locally. Falls back to the plain DOM letters without WebGL.
 */
export function HeroName({
  nameRef,
  flash,
  active,
}: {
  nameRef: Ref<HTMLDivElement>
  flash: MotionValue<number>
  active: boolean
}) {
  const letters = useRef<(HTMLSpanElement | null)[]>([])
  const canvas = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active
  const [gl, setGl] = useState<"pending" | "on" | "off">("pending")

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const stop = startWind(cv, letters.current, activeRef, flash, reduced)
    setGl(stop ? "on" : "off")
    return stop ?? undefined
  }, [flash])

  return (
    <div
      ref={nameRef}
      className="hero-name absolute -translate-x-1/2 font-display uppercase leading-[0.82] tracking-[-0.01em] whitespace-nowrap"
    >
      <h1 className="sr-only">Nafiz</h1>
      {/* Layout source for the texture; visible only if WebGL is unavailable. */}
      <div aria-hidden className={gl === "off" ? "hero-face" : "text-transparent"}>
        {NAME.split("").map((ch, i) => (
          <span
            key={i}
            ref={(el) => {
              letters.current[i] = el
            }}
            className="relative inline-block"
          >
            {ch}
          </span>
        ))}
      </div>
      <canvas
        ref={canvas}
        aria-hidden
        className="pointer-events-none absolute"
        style={{ left: `${-BOX.left * 100}%`, top: `${-BOX.top * 100}%`, width: `${BOX.width * 100}%`, height: `${BOX.height * 100}%` }}
      />
    </div>
  )
}

// Canvas box relative to the name box: extra room on the right for wisps blown downwind.
const BOX = { left: 0.04, top: 0.2, width: 1.2, height: 1.4 }

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uText;
uniform vec2 uRes;
uniform float uTime;
uniform float uGust;
uniform float uFront;
uniform float uIntro;
uniform float uFlash;
uniform vec3 uMouse;     // xy in uv (top-down), z = strength
uniform vec2 uMouseVel;  // uv per second
uniform vec2 uBand;      // top / height of the letters in uv, for the face gradient

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return s;
}
float A(vec2 q) { return texture2D(uText, q).a; }

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 q = p * asp;
  float t = uTime;

  // Gust: a soft band travelling left to right.
  float g = uGust * exp(-pow((p.x - uFront) / 0.25, 2.0));

  // Cursor influence.
  vec2 md = (p - uMouse.xy) * asp;
  float mk = uMouse.z * exp(-dot(md, md) / 0.018);

  // 1) The letters ripple: coherent turbulence stretched along the wind, drifting downwind.
  float n1 = fbm(q * vec2(1.4, 4.5) + vec2(-t * 0.42, t * 0.05));
  float n2 = fbm(q * vec2(1.9, 2.6) + vec2(-t * 0.33, 4.7));
  float amp = 0.006 + g * 0.022 + uIntro * 0.06;
  vec2 disp = vec2((n1 - 0.5) * amp * 1.5, (n2 - 0.5) * amp);
  // Gusts lean the tops of the letters downwind, like a push.
  disp.x -= g * 0.02 * (1.0 - clamp((p.y - uBand.x) / uBand.y, 0.0, 1.0));
  disp -= normalize(md + 1e-5) / asp * mk * 0.02;
  disp -= uMouseVel * mk * 0.035;
  vec2 sp = p + disp;
  float body = A(sp);

  // 2) Downwind edges smear into wisps: sample upwind, with a length that varies row by row.
  float rows = fbm(vec2(q.y * 18.0, t * 0.25 - q.x * 0.6));
  float len = (0.03 + g * 0.11 + uIntro * 0.25 + mk * 0.06) * (0.25 + 1.5 * rows * rows);
  float trail = 0.0;
  float wsum = 0.0;
  for (int i = 1; i <= 14; i++) {
    float f = float(i) / 14.0;
    float w = (1.0 - f) * (1.0 - f);
    trail += A(sp - vec2(f * len, f * len * 0.06)) * w;
    wsum += w;
  }
  trail /= wsum;
  // Break the wisps up so they read as air, not blur.
  float e = fbm(q * vec2(2.5, 14.0) + vec2(-t * 0.9, 0.0));
  float wisps = trail * smoothstep(0.38, 0.72, e);

  float a = max(body, wisps * 0.8);

  // Intro: the name blows in from the left.
  float front = mix(-0.2, 1.4, 1.0 - uIntro);
  a *= 1.0 - smoothstep(front - 0.12, front + 0.12, p.x);

  // Face colour: the same soft steel gradient as the rest of the hero; wisps are paler.
  float ly = clamp((p.y - uBand.x) / uBand.y, 0.0, 1.0);
  vec3 col = mix(vec3(0.957, 0.973, 0.969), vec3(0.70, 0.77, 0.78), ly);
  col = mix(vec3(0.86, 0.91, 0.92), col, body);
  col *= 1.0 + uFlash * 0.3;
  gl_FragColor = vec4(col * a, a);
}`

function startWind(
  cv: HTMLCanvasElement,
  letterEls: (HTMLSpanElement | null)[],
  active: { current: boolean },
  flash: MotionValue<number>,
  reduced: boolean,
): (() => void) | null {
  const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false })
  if (!gl) return null

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader")
    return s
  }
  let prog: WebGLProgram
  try {
    prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  } catch {
    return null
  }
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, "aPos")
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const U = (n: string) => gl.getUniformLocation(prog, n)
  const u = {
    res: U("uRes"),
    time: U("uTime"),
    gust: U("uGust"),
    front: U("uFront"),
    intro: U("uIntro"),
    flash: U("uFlash"),
    mouse: U("uMouse"),
    vel: U("uMouseVel"),
    band: U("uBand"),
  }
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  let ready = false
  let W = 0
  let H = 0

  // Draw the letters into a texture at exactly their DOM positions (each is its own inline-block).
  const build = () => {
    const wrap = cv.parentElement!
    const cs = getComputedStyle(wrap)
    const fs = parseFloat(cs.fontSize)
    const dpr = Math.min(window.devicePixelRatio, 1.5)
    W = Math.round(cv.clientWidth * dpr)
    H = Math.round(cv.clientHeight * dpr)
    if (!W || !H) return
    cv.width = W
    cv.height = H
    const off = document.createElement("canvas")
    off.width = W
    off.height = H
    const o = off.getContext("2d")!
    o.scale(dpr, dpr)
    o.font = `${fs}px ${cs.fontFamily}`
    o.fillStyle = "#fff"
    const m = o.measureText("N")
    const L = parseFloat(cs.lineHeight) || fs * 0.82
    const Asc = m.fontBoundingBoxAscent
    const Dsc = m.fontBoundingBoxDescent
    const ox = (cv.clientWidth / BOX.width) * BOX.left
    const oy = (cv.clientHeight / BOX.height) * BOX.top
    for (const el of letterEls) {
      if (!el) continue
      o.fillText(el.textContent?.[0] ?? "", ox + el.offsetLeft, oy + el.offsetTop + (L - (Asc + Dsc)) / 2 + Asc)
    }
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off)
    gl.viewport(0, 0, W, H)
    gl.uniform2f(u.res, W, H)
    // Letter band (cap height) in uv, for the face gradient and the gust lean.
    const capTop = oy + (L - (Asc + Dsc)) / 2 + Asc - (m.actualBoundingBoxAscent || fs * 0.72)
    const capH = m.actualBoundingBoxAscent || fs * 0.72
    gl.uniform2f(u.band, capTop / cv.clientHeight, capH / cv.clientHeight)
    ready = true
    if (reduced) render(8, 0)
  }

  const pointer = { x: -1, y: -1, vx: 0, vy: 0, k: 0, last: 0 }
  const onMove = (e: PointerEvent) => {
    const r = cv.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const now = performance.now()
    const dt = Math.max(8, now - pointer.last) / 1000
    if (pointer.last) {
      pointer.vx = pointer.vx * 0.5 + ((x - pointer.x) / dt) * 0.5
      pointer.vy = pointer.vy * 0.5 + ((y - pointer.y) / dt) * 0.5
    }
    pointer.last = now
    pointer.x = x
    pointer.y = y
    if (x > -0.1 && x < 1.1 && y > -0.1 && y < 1.1) pointer.k = 1
  }

  let gustAt = 3.2
  let front = -1
  let gust = 0
  const render = (time: number, intro: number) => {
    gl.uniform1f(u.time, time)
    gl.uniform1f(u.gust, gust)
    gl.uniform1f(u.front, front)
    gl.uniform1f(u.intro, intro)
    gl.uniform1f(u.flash, flash.get())
    gl.uniform3f(u.mouse, pointer.x, pointer.y, pointer.k)
    gl.uniform2f(u.vel, Math.max(-3, Math.min(3, pointer.vx)), Math.max(-3, Math.min(3, pointer.vy)))
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  let buildTimer = 0
  let disposed = false
  document.fonts.ready.then(() => {
    if (!disposed) buildTimer = window.setTimeout(build, 30)
  })
  const onResize = () => {
    clearTimeout(buildTimer)
    buildTimer = window.setTimeout(build, 150)
  }
  window.addEventListener("resize", onResize)
  window.addEventListener("pointermove", onMove, { passive: true })

  let t = 0
  let born = 0
  let last = performance.now()
  let id = 0
  const tick = (now: number) => {
    id = requestAnimationFrame(tick)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (!active.current || !ready || reduced) return
    t += dt
    born += dt
    // Gust scheduling: ease in, sweep across, ease out.
    if (t > gustAt) {
      front = -0.35
      gustAt = t + 6 + Math.random() * 5
    }
    if (front > -0.5) {
      front += dt * 0.55
      gust = Math.min(1, gust + dt * 2)
      if (front > 1.5) front = -1
    } else gust = Math.max(0, gust - dt * 2)
    pointer.k *= Math.pow(0.25, dt)
    pointer.vx *= Math.pow(0.1, dt)
    pointer.vy *= Math.pow(0.1, dt)
    const k = Math.min(1, born / 2.2)
    const intro = 1 - k * k * (3 - 2 * k)
    render(t, intro)
  }
  id = requestAnimationFrame(tick)

  return () => {
    disposed = true
    cancelAnimationFrame(id)
    clearTimeout(buildTimer)
    window.removeEventListener("resize", onResize)
    window.removeEventListener("pointermove", onMove)
    // Free GPU objects but keep the context: React may remount on the same canvas.
    gl.deleteTexture(tex)
    gl.deleteBuffer(buf)
    gl.deleteProgram(prog)
  }
}
