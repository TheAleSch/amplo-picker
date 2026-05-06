"use client";

import * as React from "react";
import { AMPLO_RAINBOW_PATH, AMPLO_RAINBOW_VIEWBOX } from "./amplo-mark";

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Rainbow + god rays + bloom + breathing pulse, output in sRGB.
// God rays use the classic radial-occlusion accumulation toward the mark center.
const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_mask;
uniform vec2 u_resolution;
uniform vec2 u_markCenter;
uniform vec2 u_markScale;
uniform float u_time;
uniform float u_intensity;

vec3 oklabToLinear(vec3 c) {
  float L = c.x, a = c.y, b = c.z;
  float l_ = L + 0.3963377774*a + 0.2158037573*b;
  float m_ = L - 0.1055613458*a - 0.0638541728*b;
  float s_ = L - 0.0894841775*a - 1.2914855480*b;
  float l = l_*l_*l_;
  float m = m_*m_*m_;
  float s = s_*s_*s_;
  return vec3(
     4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
    -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
    -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
  );
}

vec3 oklch(float L, float C, float h) {
  return oklabToLinear(vec3(L, C * cos(h), C * sin(h)));
}

vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  vec3 a = 12.92 * c;
  vec3 b = 1.055 * pow(c, vec3(1.0/2.4)) - 0.055;
  return mix(a, b, step(vec3(0.0031308), c));
}

float sampleMask(vec2 uv) {
  vec2 mUv = (uv - u_markCenter) / u_markScale + 0.5;
  if (any(lessThan(mUv, vec2(0.0))) || any(greaterThan(mUv, vec2(1.0)))) return 0.0;
  return texture(u_mask, mUv).r;
}

// Animated, high-chroma swirl. Hue drifts with time and warps with sin/cos
// of position so the colors flow across the rim.
vec3 swirlColor(vec2 p, vec2 center, float aspect, float t) {
  vec2 dd = p - center;
  dd.x *= aspect;
  float a = atan(dd.y, dd.x);
  float h = a + t * 0.22
          + 0.55 * sin(dd.y * 12.0 - t * 0.9)
          + 0.40 * cos(dd.x * 10.0 + t * 0.7);
  return oklch(0.74, 0.30, h);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  float mask = sampleMask(uv);
  vec3 fill = swirlColor(uv, u_markCenter, aspect, u_time);

  vec3 col = fill * mask * u_intensity;
  outColor = vec4(linearToSrgb(max(col, vec3(0.0))), 1.0);
}`;

const MASK_PIXELS = 1024;

function buildMaskTexture(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const [, , vbW, vbH] = AMPLO_RAINBOW_VIEWBOX.split(" ").map(Number);
  c.width = MASK_PIXELS;
  c.height = Math.round((MASK_PIXELS * vbH) / vbW);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#fff";
  const sx = c.width / vbW;
  const sy = c.height / vbH;
  ctx.scale(sx, sy);
  ctx.fill(new Path2D(AMPLO_RAINBOW_PATH));
  return c;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader compile: ${log}`);
  }
  return sh;
}

export interface GodRayCanvasProps {
  className?: string;
  markCenterFraction?: { x: number; y: number };
  markWidthFraction?: number;
  intensity?: number;
}

export function GodRayCanvas({
  className,
  markCenterFraction = { x: 0.34, y: 0.4 },
  markWidthFraction = 0.24,
  intensity = 1.0,
}: GodRayCanvasProps) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "a_pos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`link: ${gl.getProgramInfoLog(prog)}`);
    }

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildMaskTexture());

    const uMask = gl.getUniformLocation(prog, "u_mask");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uCenter = gl.getUniformLocation(prog, "u_markCenter");
    const uScale = gl.getUniformLocation(prog, "u_markScale");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uIntensity = gl.getUniformLocation(prog, "u_intensity");

    const [, , vbW, vbH] = AMPLO_RAINBOW_VIEWBOX.split(" ").map(Number);
    const markAspect = vbW / vbH;

    let raf = 0;
    let start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const W = Math.max(1, Math.floor(w * dpr));
      const H = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      gl.viewport(0, 0, W, H);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const tick = () => {
      const t = (performance.now() - start) / 1000;
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(uMask, 0);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uCenter, markCenterFraction.x, 1 - markCenterFraction.y);
      const aspect = canvas.width / canvas.height;
      const sx = markWidthFraction;
      const sy = (markWidthFraction * aspect) / markAspect;
      gl.uniform2f(uScale, sx, sy);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uIntensity, intensity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(tex);
    };
  }, [markCenterFraction.x, markCenterFraction.y, markWidthFraction, intensity]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
