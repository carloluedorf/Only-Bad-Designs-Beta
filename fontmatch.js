/* Schriftvergleich: dieselben Merkmale beim Bau des Index (scripts/build-font-index.mjs) und bei der Suche im Tool.
   Glyphen liegen im Tool-Format vor: SVG-Pfad mit absoluten Koordinaten, Grundlinie bei y = 800, Versalhöhe = 700. */
(function (root) {
  "use strict";
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const TOP = -50, SPAN = 1150;           // Rahmen: knapp über Oberlängen bis unter die Unterlängen
  const G1 = 16, THR = 0.4;               // Index: 16 × 16 Raster, 1 Bit pro Zelle
  const BYTES = G1 * G1 / 8;

  let cv = null;
  function ctx2d(size) {
    if (!cv) cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(size, size) : document.createElement("canvas");
    if (cv.width !== size) { cv.width = size; cv.height = size; }
    return cv.getContext("2d", { willReadFrequently: true });
  }
  function xRange(d) {
    const n = d.match(/-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
    let x0 = Infinity, x1 = -Infinity;
    for (let i = 0; i + 1 < n.length; i += 2) { const x = +n[i]; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    return x0 <= x1 ? [x0, x1] : [0, 0];
  }
  /* Deckungsgrad je Zelle (0…1), Glyphe horizontal zentriert, vertikal fest an Grundlinie und Versalhöhe */
  function grid(d, G) {
    const S = 4, R = G * S, g = ctx2d(R), [x0, x1] = xRange(d), sc = R / SPAN;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, R, R);
    g.setTransform(sc, 0, 0, sc, -((x0 + x1) / 2 - SPAN / 2) * sc, -TOP * sc);
    g.fillStyle = "#000"; g.fill(new Path2D(d));
    const px = g.getImageData(0, 0, R, R).data, out = new Float32Array(G * G);
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) out[((y / S) | 0) * G + ((x / S) | 0)] += px[(y * R + x) * 4 + 3];
    for (let i = 0; i < out.length; i++) out[i] /= 255 * S * S;
    return out;
  }
  function pack(gr) {
    const b = new Uint8Array(BYTES);
    for (let i = 0; i < gr.length; i++) if (gr[i] >= THR) b[i >> 3] |= 1 << (i & 7);
    return b;
  }
  const POP = new Uint8Array(256).map((_, i) => { let c = 0; for (let v = i; v; v >>= 1) c += v & 1; return c; });
  /* Dice-Ähnlichkeit zweier gepackter Raster */
  function dice(a, ao, b, bo) {
    let inter = 0, na = 0, nb = 0;
    for (let i = 0; i < BYTES; i++) { const x = a[ao + i], y = b[bo + i]; inter += POP[x & y]; na += POP[x]; nb += POP[y]; }
    return na + nb ? 2 * inter / (na + nb) : 1;
  }
  function blur(gr, G) {
    const o = new Float32Array(gr.length);
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= G || xx >= G) continue; const w = dx || dy ? 1 : 2; s += gr[yy * G + xx] * w; n += w; }
      o[y * G + x] = s / n;
    }
    return o;
  }
  /* weiche Schnittmenge / Vereinigung zweier Deckungsraster */
  function softIoU(a, b) {
    let mn = 0, mx = 0;
    for (let i = 0; i < a.length; i++) { mn += Math.min(a[i], b[i]); mx += Math.max(a[i], b[i]); }
    return mx ? mn / mx : 1;
  }
  /* Font (opentype.js) → Glyphen im Tool-Format */
  function fontGlyphs(font, chars) {
    const upm = font.unitsPerEm || 1000, H = font.charToGlyph("H");
    let cap = H && H.index ? H.getBoundingBox().y2 : 0;
    if (!(cap > upm * 0.3)) cap = (font.tables.os2 && font.tables.os2.sCapHeight) || upm * 0.7;
    const k = 700 / cap, out = {};
    for (const ch of chars) {
      const g = font.charToGlyph(ch);
      if (!g || !g.index) continue;
      const d = g.getPath(0, 800, k * upm).toPathData(1);
      if (!d) continue;
      out[ch] = { d, w: Math.round(g.advanceWidth * k) };
    }
    return out;
  }
  root.FontMatch = { CHARS, G1, BYTES, grid, pack, dice, blur, softIoU, fontGlyphs };
})(typeof window !== "undefined" ? window : globalThis);
