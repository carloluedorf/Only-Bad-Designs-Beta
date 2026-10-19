// Baut fonts/index.bin + fonts/catalog.json aus lokal abgelegten Fontsource-WOFF-Dateien.
// Aufruf: node scripts/build-font-index.mjs <woff-ordner> <google-fonts-v2.json>
// Die WOFF-Dateien heißen <id>-<gewicht>.woff (z. B. aus den npm-Paketen @fontsource/<id>, Datei files/<id>-latin-<gewicht>-normal.woff).
// Gerechnet wird in Chromium mit fontmatch.js, also genau so wie später im Tool.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [woffDir, metaFile] = process.argv.slice(2);
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
const CAT = { "sans-serif": "s", serif: "r", display: "d", handwriting: "h", monospace: "m" };

const fonts = {};
for (const [id, v] of Object.entries(meta)) {
  if (!v.subsets.includes("latin") || !v.styles.includes("normal")) continue;
  fonts[id] = [v.family, CAT[v.category] || "d", v.weights];
}
const jobs = fs.readdirSync(woffDir).filter(f => f.endsWith(".woff")).map(f => {
  const m = f.match(/^(.+)-(\d+)\.woff$/); return m && fonts[m[1]] ? { id: m[1], w: +m[2], file: path.join(woffDir, f) } : null;
}).filter(Boolean).sort((a, b) => a.id.localeCompare(b.id) || a.w - b.w);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><meta charset=utf8><body>");
await page.addScriptTag({ path: path.join(repo, "vendor/opentype.min.js") });
await page.addScriptTag({ path: path.join(repo, "fontmatch.js") });

const entries = [], chunks = [];
const B = 40;
for (let i = 0; i < jobs.length; i += B) {
  const batch = jobs.slice(i, i + B).map(j => ({ id: j.id, w: j.w, b64: fs.readFileSync(j.file).toString("base64") }));
  const res = await page.evaluate(batch => batch.map(({ id, w, b64 }) => {
    try {
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const font = opentype.parse(bin.buffer);
      const FM = FontMatch, gl = FM.fontGlyphs(font, FM.CHARS);
      const rec = new Uint8Array(8 + FM.CHARS.length * FM.BYTES);
      [...FM.CHARS].forEach((ch, ci) => {
        if (!gl[ch]) return;
        rec[ci >> 3] |= 1 << (ci & 7);
        rec.set(FM.pack(FM.grid(gl[ch].d, FM.G1)), 8 + ci * FM.BYTES);
      });
      const n = Object.keys(gl).length;
      return n >= 10 ? { id, w, rec: btoa(String.fromCharCode(...rec)) } : { id, w, err: "nur " + n + " Zeichen" };
    } catch (e) { return { id, w, err: String(e.message || e) }; }
  }), batch);
  for (const r of res) {
    if (r.err) { console.warn("übersprungen", r.id, r.w, r.err); continue; }
    entries.push([r.id, r.w]); chunks.push(Buffer.from(r.rec, "base64"));
  }
  process.stdout.write(`\r${Math.min(i + B, jobs.length)} / ${jobs.length}`);
}
await browser.close();
fs.writeFileSync(path.join(repo, "fonts/index.bin"), Buffer.concat(chunks));
fs.writeFileSync(path.join(repo, "fonts/catalog.json"), JSON.stringify({ version: 1, built: new Date().toISOString().slice(0, 10), chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", g: 16, entries, fonts }));
console.log(`\n${entries.length} Schnitte aus ${new Set(entries.map(e => e[0])).size} Schriften im Index`);
