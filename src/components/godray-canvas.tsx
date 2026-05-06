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

// Paint pass: render the colored silhouette to an offscreen framebuffer.
// Output is premultiplied vec4(color, alpha) so when this texture is later
// downsampled, the contribution outside the silhouette is honest black.
const PAINT_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_mask;
uniform vec2 u_markCenter;
uniform vec2 u_markScale;
uniform float u_time;
uniform float u_aspect;
uniform float u_swirlL;
uniform float u_swirlC;

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

float sampleMask(vec2 uv) {
  vec2 mUv = (uv - u_markCenter) / u_markScale + 0.5;
  if (any(lessThan(mUv, vec2(0.0))) || any(greaterThan(mUv, vec2(1.0)))) return 0.0;
  return texture(u_mask, mUv).r;
}

vec3 swirlColor(vec2 p, vec2 center, float aspect, float t) {
  vec2 dd = p - center;
  dd.x *= aspect;
  float a = atan(dd.y, dd.x);
  float h = a + t * 0.22
          + 0.55 * sin(dd.y * 12.0 - t * 0.9)
          + 0.40 * cos(dd.x * 10.0 + t * 0.7);
  return oklch(u_swirlL, u_swirlC, h);
}

void main() {
  float mask = sampleMask(v_uv);
  vec3 col = swirlColor(v_uv, u_markCenter, u_aspect, u_time);
  outColor = vec4(col * mask, mask);
}`;

// Separable Gaussian blur. Two passes (H + V) take the painted silhouette
// to a smooth, low-frequency version. Sampled at half canvas resolution so
// the cost is a quarter of full-res; visually indistinguishable for bloom.
const BLUR_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_src;
uniform vec2 u_step;
void main() {
  vec4 c = 0.1498 * texture(u_src, v_uv);
  c += 0.1396 * (texture(u_src, v_uv + u_step) + texture(u_src, v_uv - u_step));
  c += 0.1131 * (texture(u_src, v_uv + 2.0*u_step) + texture(u_src, v_uv - 2.0*u_step));
  c += 0.0795 * (texture(u_src, v_uv + 3.0*u_step) + texture(u_src, v_uv - 3.0*u_step));
  c += 0.0486 * (texture(u_src, v_uv + 4.0*u_step) + texture(u_src, v_uv - 4.0*u_step));
  c += 0.0259 * (texture(u_src, v_uv + 5.0*u_step) + texture(u_src, v_uv - 5.0*u_step));
  c += 0.0119 * (texture(u_src, v_uv + 6.0*u_step) + texture(u_src, v_uv - 6.0*u_step));
  c += 0.0048 * (texture(u_src, v_uv + 7.0*u_step) + texture(u_src, v_uv - 7.0*u_step));
  c += 0.0017 * (texture(u_src, v_uv + 8.0*u_step) + texture(u_src, v_uv - 8.0*u_step));
  outColor = c;
}`;

// Composite pass: sharp silhouette from paintTex, multi-scale ethereal halo
// from the mipmap chain of the Gaussian-blurred texture. Each blur LOD adds
// a wider, dimmer ring of light — and because the input was pre-blurred, no
// box-filter chunkiness leaks through.
const COMP_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_paint;
uniform sampler2D u_bloom;
uniform float u_bloomScale;
uniform float u_intensity;
uniform float u_lodStep;

vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  vec3 a = 12.92 * c;
  vec3 b = 1.055 * pow(c, vec3(1.0/2.4)) - 0.055;
  return mix(a, b, step(vec3(0.0031308), c));
}

void main() {
  vec3 sharp = texture(u_paint, v_uv).rgb;
  vec3 l0 = textureLod(u_bloom, v_uv, 0.0).rgb;
  vec3 l1 = textureLod(u_bloom, v_uv, u_lodStep).rgb;
  vec3 l2 = textureLod(u_bloom, v_uv, u_lodStep * 2.0).rgb;
  vec3 l3 = textureLod(u_bloom, v_uv, u_lodStep * 3.0).rgb;
  vec3 bloom = (l0 + l1 + l2 + l3) * 0.25;

  vec3 col = (sharp + bloom * u_bloomScale) * u_intensity;
  outColor = vec4(linearToSrgb(col), 1.0);
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

function link(
  gl: WebGL2RenderingContext,
  vs: WebGLShader,
  fs: WebGLShader,
): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, "a_pos");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`link: ${gl.getProgramInfoLog(prog)}`);
  }
  return prog;
}

export interface GodRayCanvasProps {
  className?: string;
  markCenterFraction?: { x: number; y: number };
  markWidthFraction?: number;
  intensity?: number;
  bloom?: number;
  blurStride?: number;
  lodStep?: number;
  swirlL?: number;
  swirlC?: number;
}

export function GodRayCanvas({
  className,
  markCenterFraction = { x: 0.34, y: 0.4 },
  markWidthFraction = 0.24,
  intensity = 1.25,
  bloom = 4.0,
  blurStride = 20,
  lodStep = 2.8,
  swirlL = 0.56,
  swirlC = 0.3,
}: GodRayCanvasProps) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  // Live-tunable uniforms read from a ref every frame so changes don't
  // tear down/recreate any GL resources — the panel can stream values.
  const paramsRef = React.useRef({
    intensity,
    bloom,
    blurStride,
    lodStep,
    swirlL,
    swirlC,
  });
  paramsRef.current = { intensity, bloom, blurStride, lodStep, swirlL, swirlC };

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const paintFs = compile(gl, gl.FRAGMENT_SHADER, PAINT_FRAG);
    const blurFs = compile(gl, gl.FRAGMENT_SHADER, BLUR_FRAG);
    const compFs = compile(gl, gl.FRAGMENT_SHADER, COMP_FRAG);
    const paintProg = link(gl, vs, paintFs);
    const blurProg = link(gl, vs, blurFs);
    const compProg = link(gl, vs, compFs);

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

    const mask = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, mask);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildMaskTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    const makeRtTex = (mipmap: boolean): WebGLTexture => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    };

    // paintTex: full-res silhouette. blurA: half-res H-blur intermediate.
    // blurB: half-res H+V-blurred (mipmapped — bloom source).
    const paintTex = makeRtTex(false);
    const blurA = makeRtTex(false);
    const blurB = makeRtTex(true);
    const paintFbo = gl.createFramebuffer()!;
    const fboA = gl.createFramebuffer()!;
    const fboB = gl.createFramebuffer()!;
    let paintW = 0;
    let paintH = 0;
    let blurW = 0;
    let blurH = 0;

    const allocBuffers = (w: number, h: number) => {
      if (w === paintW && h === paintH) return;
      paintW = w;
      paintH = h;
      blurW = Math.max(1, Math.floor(w / 2));
      blurH = Math.max(1, Math.floor(h / 2));

      gl.bindTexture(gl.TEXTURE_2D, paintTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, paintW, paintH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, paintFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, paintTex, 0);

      gl.bindTexture(gl.TEXTURE_2D, blurA);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, blurW, blurH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, blurA, 0);

      gl.bindTexture(gl.TEXTURE_2D, blurB);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, blurW, blurH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, blurB, 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const uPaintMask = gl.getUniformLocation(paintProg, "u_mask");
    const uPaintCenter = gl.getUniformLocation(paintProg, "u_markCenter");
    const uPaintScale = gl.getUniformLocation(paintProg, "u_markScale");
    const uPaintTime = gl.getUniformLocation(paintProg, "u_time");
    const uPaintAspect = gl.getUniformLocation(paintProg, "u_aspect");
    const uPaintSwirlL = gl.getUniformLocation(paintProg, "u_swirlL");
    const uPaintSwirlC = gl.getUniformLocation(paintProg, "u_swirlC");

    const uBlurSrc = gl.getUniformLocation(blurProg, "u_src");
    const uBlurStep = gl.getUniformLocation(blurProg, "u_step");

    const uCompPaint = gl.getUniformLocation(compProg, "u_paint");
    const uCompBloom = gl.getUniformLocation(compProg, "u_bloom");
    const uCompBloomScale = gl.getUniformLocation(compProg, "u_bloomScale");
    const uCompIntensity = gl.getUniformLocation(compProg, "u_intensity");
    const uCompLodStep = gl.getUniformLocation(compProg, "u_lodStep");

    const [, , vbW, vbH] = AMPLO_RAINBOW_VIEWBOX.split(" ").map(Number);
    const markAspect = vbW / vbH;

    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const W = Math.max(1, Math.floor(w * dpr));
      const H = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      allocBuffers(W, H);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const aspect = canvas.width / canvas.height;
      const p = paramsRef.current;

      gl.bindVertexArray(vao);

      // Pass 1: paint colored silhouette.
      gl.bindFramebuffer(gl.FRAMEBUFFER, paintFbo);
      gl.viewport(0, 0, paintW, paintH);
      gl.useProgram(paintProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, mask);
      gl.uniform1i(uPaintMask, 0);
      gl.uniform2f(uPaintCenter, markCenterFraction.x, 1 - markCenterFraction.y);
      gl.uniform2f(
        uPaintScale,
        markWidthFraction,
        (markWidthFraction * aspect) / markAspect,
      );
      gl.uniform1f(uPaintTime, t);
      gl.uniform1f(uPaintAspect, aspect);
      gl.uniform1f(uPaintSwirlL, p.swirlL);
      gl.uniform1f(uPaintSwirlC, p.swirlC);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass 2: horizontal Gaussian blur into blurA.
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
      gl.viewport(0, 0, blurW, blurH);
      gl.useProgram(blurProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, paintTex);
      gl.uniform1i(uBlurSrc, 0);
      gl.uniform2f(uBlurStep, p.blurStride / blurW, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass 3: vertical Gaussian blur into blurB.
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
      gl.viewport(0, 0, blurW, blurH);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, blurA);
      gl.uniform2f(uBlurStep, 0, p.blurStride / blurH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Mipmap chain on the blurred texture is the multi-scale bloom source.
      gl.bindTexture(gl.TEXTURE_2D, blurB);
      gl.generateMipmap(gl.TEXTURE_2D);

      // Pass 4: composite to screen.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(compProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, paintTex);
      gl.uniform1i(uCompPaint, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, blurB);
      gl.uniform1i(uCompBloom, 1);
      gl.uniform1f(uCompBloomScale, p.bloom);
      gl.uniform1f(uCompIntensity, p.intensity);
      gl.uniform1f(uCompLodStep, p.lodStep);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(paintProg);
      gl.deleteProgram(blurProg);
      gl.deleteProgram(compProg);
      gl.deleteShader(vs);
      gl.deleteShader(paintFs);
      gl.deleteShader(blurFs);
      gl.deleteShader(compFs);
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(mask);
      gl.deleteTexture(paintTex);
      gl.deleteTexture(blurA);
      gl.deleteTexture(blurB);
      gl.deleteFramebuffer(paintFbo);
      gl.deleteFramebuffer(fboA);
      gl.deleteFramebuffer(fboB);
    };
  }, [markCenterFraction.x, markCenterFraction.y, markWidthFraction]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
