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
uniform float u_hueSpeed;
uniform float u_hueOffset;

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
  float h = a + t * u_hueSpeed + u_hueOffset
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
uniform int u_lodCount;
uniform float u_whitepoint;
// 1.0 → rotate into Display-P3 primaries (canvas tagged display-p3);
// 0.0 → stay in sRGB primaries (canvas tagged srgb). Same transfer curve.
uniform float u_outputP3;

// Display-P3 uses the same transfer function as sRGB but wider primaries.
// We compute everything in linear sRGB (where OKLab natively lands), then
// rotate into linear Display-P3 primaries before applying the transfer.
// The canvas is tagged display-p3 so the browser routes the result to the
// wide-gamut display path.
vec3 linearSrgbToLinearP3(vec3 c) {
  return vec3(
    0.8224621*c.r + 0.1775380*c.g,
    0.0331941*c.r + 0.9668058*c.g,
    0.0170827*c.r + 0.0723974*c.g + 0.9105199*c.b
  );
}

vec3 linearToTransfer(vec3 c) {
  c = max(c, vec3(0.0));
  vec3 a = 12.92 * c;
  vec3 b = 1.055 * pow(c, vec3(1.0/2.4)) - 0.055;
  return mix(a, b, step(vec3(0.0031308), c));
}

// Extended Reinhard with whitepoint W: c * (1 + c/W²) / (1 + c). At W=1
// this is plain Reinhard (anything bright crushes hard). As W grows, the
// curve straightens out — bright values stay bright instead of compressing
// to grey. High W + high bloom is the "illuminate the page" combo.
vec3 toneMap(vec3 c, float W) {
  float W2 = max(W * W, 1e-4);
  return c * (1.0 + c / W2) / (1.0 + c);
}

// Interleaved gradient noise — cheap pixel-coordinate hash that produces
// a high-quality blue-noise-like dither. Adding ±0.5/255 in 8-bit display
// space breaks up the visible quantization stripes in dark gradients.
float ign(vec2 p) {
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}

void main() {
  vec4 paintSample = texture(u_paint, v_uv);
  vec3 sharp = paintSample.rgb;
  float fillAlpha = paintSample.a;
  // Chain of LOD samples: each step is u_lodStep mip levels coarser than
  // the last. Count and step together control how broad the halo spreads
  // and how soon you start hitting deep-mip rectangle artifacts.
  const int MAX_LODS = 8;
  vec3 bloom = vec3(0.0);
  for (int i = 0; i < MAX_LODS; i++) {
    if (i >= u_lodCount) break;
    bloom += textureLod(u_bloom, v_uv, float(i) * u_lodStep).rgb;
  }
  bloom /= max(float(u_lodCount), 1.0);

  vec3 col = (sharp + bloom * u_bloomScale) * u_intensity;
  vec3 mapped = toneMap(col, u_whitepoint);
  vec3 primaries = mix(mapped, linearSrgbToLinearP3(mapped), u_outputP3);
  vec3 display = linearToTransfer(primaries);
  display += (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  // Coverage-based alpha: silhouette is fully opaque, bloom carries its own
  // luminance, dark regions go transparent so the section bg shows through.
  float alpha = clamp(max(fillAlpha, max(display.r, max(display.g, display.b))), 0.0, 1.0);
  outColor = vec4(display, alpha);
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
  /**
   * Resolution divisor for the halo/bloom chain (paint 1b + blur + mipmaps).
   * The blur is a low-pass filter, so anything above its cutoff is discarded
   * anyway — running it at 1/4 res is ~16× cheaper and visually identical.
   * The sharp silhouette always renders at full resolution. Changing this
   * reallocates GL buffers (brief re-init).
   */
  bloomDivisor?: number;
  /**
   * Frame-stats callback, invoked ~2×/second while the loop runs. `fps` is
   * the rAF rate (vsync-capped). `gpuMs` is the GPU render time per frame
   * via EXT_disjoint_timer_query_webgl2 (null when unsupported — Safari) —
   * 1000/gpuMs is the *uncapped* framerate the shader could sustain.
   */
  onFrameStats?: (stats: { fps: number; gpuMs: number | null }) => void;
  /**
   * Output color space. "display-p3" tags the drawing buffer P3 and rotates
   * the shader's linear-sRGB result into P3 primaries; "srgb" skips both.
   * Live-switchable — useful for eyeballing what non-P3 displays get.
   */
  colorSpace?: "srgb" | "display-p3";
  /**
   * Maximum render rate. rAF fires at display refresh (120+ on ProMotion);
   * frames arriving early are skipped, so a 120Hz panel renders at most
   * `fpsCap` shader frames per second. 0 disables the cap.
   */
  fpsCap?: number;
  intensity?: number;
  bloom?: number;
  blurStride?: number;
  blurPasses?: number;
  lodStep?: number;
  lodCount?: number;
  whitepoint?: number;
  hueSpeed?: number;
  haloHueOffset?: number;
  swirlL?: number;
  swirlC?: number;
  haloL?: number;
  haloC?: number;
}

export function GodRayCanvas({
  className,
  markCenterFraction = { x: 0.34, y: 0.4 },
  markWidthFraction = 0.24,
  bloomDivisor = 4,
  onFrameStats,
  colorSpace = "display-p3",
  fpsCap = 90,
  intensity = 0.75,
  bloom = 6,
  blurStride = 30,
  blurPasses = 4,
  lodStep = 2.6,
  lodCount = 4,
  whitepoint = 1.0,
  hueSpeed = 1.0,
  haloHueOffset = 0,
  swirlL = 0.66,
  swirlC = 0.36,
  haloL = 0.47,
  haloC = 0.14,
}: GodRayCanvasProps) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  // Live-tunable uniforms read from a ref every frame so changes don't
  // tear down/recreate any GL resources — the panel can stream values.
  const paramsRef = React.useRef({
    colorSpace,
    fpsCap,
    intensity,
    bloom,
    blurStride,
    blurPasses,
    lodStep,
    lodCount,
    whitepoint,
    hueSpeed,
    haloHueOffset,
    swirlL,
    swirlC,
    haloL,
    haloC,
  });
  paramsRef.current = {
    colorSpace,
    fpsCap,
    intensity,
    bloom,
    blurStride,
    blurPasses,
    lodStep,
    lodCount,
    whitepoint,
    hueSpeed,
    haloHueOffset,
    swirlL,
    swirlC,
    haloL,
    haloC,
  };

  const onFrameStatsRef = React.useRef(onFrameStats);
  onFrameStatsRef.current = onFrameStats;

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    // colorSpace isn't in lib.dom.d.ts for WebGLContextAttributes yet, so we
    // cast the options bag. The browser-side attribute is real and covers
    // context creation; the runtime setter below covers later browsers.
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      premultipliedAlpha: false,
      colorSpace: "display-p3",
    } as WebGLContextAttributes);
    if (!gl) return;
    try {
      (gl as WebGL2RenderingContext & { drawingBufferColorSpace?: string }).drawingBufferColorSpace = "display-p3";
    } catch {
      /* older browsers ignore this — sRGB output still works */
    }

    // Float color buffers eliminate banding from intermediate quantization.
    // 16-bit half-floats give ~10 bits of mantissa per channel — plenty for
    // smooth gradients — and stay renderable on every modern GPU. If the
    // extension is missing (very old hardware), fall back to 8-bit.
    const hdr = gl.getExtension("EXT_color_buffer_float");
    const fboInternal = hdr ? gl.RGBA16F : gl.RGBA;
    const fboType = hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

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

    // paintTex holds the fill (sharp). haloSrc holds a separately colored
    // copy of the silhouette used as the bloom input — letting the user
    // pick a different L/C for the halo than for the fill. blurA/blurB are
    // the H/V Gaussian intermediates. blurB has mipmaps and is the bloom
    // source. The whole halo chain lives at 1/bloomDivisor resolution: the
    // Gaussian discards those frequencies anyway, so only cost changes.
    const paintTex = makeRtTex(false);
    const haloSrc = makeRtTex(false);
    const blurA = makeRtTex(false);
    const blurB = makeRtTex(true);
    const paintFbo = gl.createFramebuffer()!;
    const haloFbo = gl.createFramebuffer()!;
    const fboA = gl.createFramebuffer()!;
    const fboB = gl.createFramebuffer()!;
    let paintW = 0;
    let paintH = 0;
    // Bloom chain (haloSrc → blurA/blurB → mips) runs at reduced resolution.
    let bloomW = 0;
    let bloomH = 0;
    const div = Math.max(1, Math.round(bloomDivisor));

    const allocBuffers = (w: number, h: number) => {
      if (w === paintW && h === paintH) return;
      paintW = w;
      paintH = h;
      bloomW = Math.max(1, Math.floor(w / div));
      bloomH = Math.max(1, Math.floor(h / div));

      const allocAttach = (
        tex: WebGLTexture,
        fbo: WebGLFramebuffer,
        tw: number,
        th: number,
      ) => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, fboInternal, tw, th, 0, gl.RGBA, fboType, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      };

      allocAttach(paintTex, paintFbo, w, h);
      allocAttach(haloSrc, haloFbo, bloomW, bloomH);
      allocAttach(blurA, fboA, bloomW, bloomH);
      allocAttach(blurB, fboB, bloomW, bloomH);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const uPaintMask = gl.getUniformLocation(paintProg, "u_mask");
    const uPaintCenter = gl.getUniformLocation(paintProg, "u_markCenter");
    const uPaintScale = gl.getUniformLocation(paintProg, "u_markScale");
    const uPaintTime = gl.getUniformLocation(paintProg, "u_time");
    const uPaintAspect = gl.getUniformLocation(paintProg, "u_aspect");
    const uPaintSwirlL = gl.getUniformLocation(paintProg, "u_swirlL");
    const uPaintSwirlC = gl.getUniformLocation(paintProg, "u_swirlC");
    const uPaintHueSpeed = gl.getUniformLocation(paintProg, "u_hueSpeed");
    const uPaintHueOffset = gl.getUniformLocation(paintProg, "u_hueOffset");

    const uBlurSrc = gl.getUniformLocation(blurProg, "u_src");
    const uBlurStep = gl.getUniformLocation(blurProg, "u_step");

    const uCompPaint = gl.getUniformLocation(compProg, "u_paint");
    const uCompBloom = gl.getUniformLocation(compProg, "u_bloom");
    const uCompBloomScale = gl.getUniformLocation(compProg, "u_bloomScale");
    const uCompIntensity = gl.getUniformLocation(compProg, "u_intensity");
    const uCompLodStep = gl.getUniformLocation(compProg, "u_lodStep");
    const uCompLodCount = gl.getUniformLocation(compProg, "u_lodCount");
    const uCompWhitepoint = gl.getUniformLocation(compProg, "u_whitepoint");
    const uCompOutputP3 = gl.getUniformLocation(compProg, "u_outputP3");

    const [, , vbW, vbH] = AMPLO_RAINBOW_VIEWBOX.split(" ").map(Number);
    const markAspect = vbW / vbH;

    let raf = 0;
    const start = performance.now();
    // Setup tagged the context display-p3; renderFrame retags on change.
    let appliedColorSpace = "display-p3";
    // Reduced motion: draw one static frame instead of animating.
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const W = Math.max(1, Math.floor(w * dpr));
      const H = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      allocBuffers(W, H);
      // The animation loop repaints anyway; the static frame must repaint
      // here or a resize would leave a stretched stale image.
      if (reducedMotion) renderFrame();
    };

    const renderFrame = () => {
      const t = (performance.now() - start) / 1000;
      const aspect = canvas.width / canvas.height;
      const p = paramsRef.current;

      gl.bindVertexArray(vao);

      // Shared paint setup — same shader, same mask/geometry uniforms; only
      // the swirl L/C differ between the two passes.
      gl.useProgram(paintProg);
      gl.viewport(0, 0, paintW, paintH);
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
      gl.uniform1f(uPaintHueSpeed, p.hueSpeed);

      // Pass 1a: paint fill colors into paintTex (the sharp silhouette).
      gl.bindFramebuffer(gl.FRAMEBUFFER, paintFbo);
      gl.uniform1f(uPaintSwirlL, p.swirlL);
      gl.uniform1f(uPaintSwirlC, p.swirlC);
      gl.uniform1f(uPaintHueOffset, 0.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass 1b: paint halo colors into haloSrc (the bloom input) at bloom
      // resolution — the shader works in UV space, so only the viewport
      // changes.
      gl.bindFramebuffer(gl.FRAMEBUFFER, haloFbo);
      gl.viewport(0, 0, bloomW, bloomH);
      gl.uniform1f(uPaintSwirlL, p.haloL);
      gl.uniform1f(uPaintSwirlC, p.haloC);
      gl.uniform1f(uPaintHueOffset, p.haloHueOffset);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass 2: separable Gaussian blur, iterated p.blurPasses times.
      // Combined sigma multiplies by sqrt(N) per iteration → wider, softer
      // halo without ever increasing the per-iteration tap count. u_step is
      // in UV space relative to the *canvas* size, so blurStride keeps its
      // meaning (px on screen) at any bloomDivisor.
      gl.useProgram(blurProg);
      gl.viewport(0, 0, bloomW, bloomH);
      gl.uniform1i(uBlurSrc, 0);
      const passes = Math.max(1, Math.min(8, Math.round(p.blurPasses)));
      let blurSrc: WebGLTexture = haloSrc;
      for (let i = 0; i < passes; i++) {
        // H pass: blurSrc → blurA
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, blurSrc);
        gl.uniform2f(uBlurStep, p.blurStride / paintW, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // V pass: blurA → blurB
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
        gl.bindTexture(gl.TEXTURE_2D, blurA);
        gl.uniform2f(uBlurStep, 0, p.blurStride / paintH);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        blurSrc = blurB;
      }

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
      gl.uniform1i(uCompLodCount, Math.max(1, Math.min(8, Math.round(p.lodCount))));
      gl.uniform1f(uCompWhitepoint, Math.max(0.01, p.whitepoint));
      gl.uniform1f(uCompOutputP3, p.colorSpace === "display-p3" ? 1 : 0);
      // Retag the drawing buffer when the target space changes so the
      // browser's compositor interprets the shader output correctly.
      if (p.colorSpace !== appliedColorSpace) {
        appliedColorSpace = p.colorSpace;
        try {
          (gl as WebGL2RenderingContext & { drawingBufferColorSpace?: string }).drawingBufferColorSpace = p.colorSpace;
        } catch {
          /* older browsers: uniform still switches the primaries */
        }
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Frame stats: rAF fps is trivial; true GPU cost needs the disjoint
    // timer extension (Chrome/Edge/Firefox — Safari lacks it, gpuMs stays
    // null there). One query object, re-issued only after its result is
    // read: overlapping TIME_ELAPSED queries on one object are invalid.
    interface TimerExt {
      TIME_ELAPSED_EXT: number;
      GPU_DISJOINT_EXT: number;
    }
    const timerExt = gl.getExtension(
      "EXT_disjoint_timer_query_webgl2",
    ) as TimerExt | null;
    const gpuQuery = timerExt ? gl.createQuery() : null;
    let queryPending = false;
    let gpuMs: number | null = null;
    let statFrames = 0;
    let statT0 = performance.now();

    // Frame limiter state: rAF fires at display refresh; frames arriving
    // before 1000/fpsCap ms have passed are skipped. lastRender advances in
    // whole intervals so the effective rate doesn't drift below the cap.
    let lastRender = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const cap = paramsRef.current.fpsCap;
      if (cap > 0) {
        const interval = 1000 / cap;
        if (now - lastRender < interval) return;
        lastRender = now - ((now - lastRender) % interval);
      }
      const wantStats = !!onFrameStatsRef.current;
      let measuring = false;
      if (wantStats && timerExt && gpuQuery) {
        if (queryPending) {
          if (gl.getParameter(timerExt.GPU_DISJOINT_EXT)) {
            queryPending = false; // discard — timer state is unreliable
          } else if (gl.getQueryParameter(gpuQuery, gl.QUERY_RESULT_AVAILABLE)) {
            const ns = gl.getQueryParameter(gpuQuery, gl.QUERY_RESULT) as number;
            const ms = ns / 1e6;
            // Light EMA so the readout doesn't jitter frame to frame.
            gpuMs = gpuMs === null ? ms : gpuMs * 0.8 + ms * 0.2;
            queryPending = false;
          }
        }
        if (!queryPending) {
          gl.beginQuery(timerExt.TIME_ELAPSED_EXT, gpuQuery);
          measuring = true;
        }
      }
      renderFrame();
      if (measuring && timerExt) {
        gl.endQuery(timerExt.TIME_ELAPSED_EXT);
        queryPending = true;
      }

      if (wantStats) {
        statFrames++;
        const now = performance.now();
        const elapsed = now - statT0;
        if (elapsed >= 500) {
          onFrameStatsRef.current?.({
            fps: (statFrames * 1000) / elapsed,
            gpuMs,
          });
          statFrames = 0;
          statT0 = now;
        }
      }
    };
    const startLoop = () => {
      if (raf) return;
      if (reducedMotion) renderFrame();
      else raf = requestAnimationFrame(tick);
    };
    const stopLoop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // Don't burn GPU while the hero is scrolled out of view — rAF only
    // auto-pauses on hidden *tabs*, not for off-screen elements.
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) startLoop();
      else stopLoop();
    });
    io.observe(canvas);
    startLoop();

    return () => {
      stopLoop();
      ro.disconnect();
      io.disconnect();
      if (gpuQuery) gl.deleteQuery(gpuQuery);
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
      gl.deleteTexture(haloSrc);
      gl.deleteTexture(blurA);
      gl.deleteTexture(blurB);
      gl.deleteFramebuffer(paintFbo);
      gl.deleteFramebuffer(haloFbo);
      gl.deleteFramebuffer(fboA);
      gl.deleteFramebuffer(fboB);
    };
  }, [markCenterFraction.x, markCenterFraction.y, markWidthFraction, bloomDivisor]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
