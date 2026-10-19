// Baut fonts/flyer/<id>.json (Glyphen im Tool-Format) + fonts/flyer/index.json aus lokalen WOFF-Dateien.
// Aufruf: node scripts/build-flyer-fonts.mjs <woff-ordner>
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const woffDir = process.argv[2];
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
// [id, Gewicht, Gruppe, Familienname]
const PICKS = [
  ["pirata-one", 400, "Metal & Fraktur", "Pirata One"], ["new-rocker", 400, "Metal & Fraktur", "New Rocker"],
  ["grenze-gotisch", 900, "Metal & Fraktur", "Grenze Gotisch"], ["jacquard-24", 400, "Metal & Fraktur", "Jacquard 24"], ["unifrakturcook", 700, "Metal & Fraktur", "UnifrakturCook"],
  ["fascinate", 400, "Jugendstil & Psychedelic", "Fascinate"], ["fascinate-inline", 400, "Jugendstil & Psychedelic", "Fascinate Inline"], ["ewert", 400, "Jugendstil & Psychedelic", "Ewert"],
  ["monoton", 400, "Jugendstil & Psychedelic", "Monoton"], ["bungee-shade", 400, "Jugendstil & Psychedelic", "Bungee Shade"],
  ["alfa-slab-one", 400, "Holzschrift & Western", "Alfa Slab One"], ["ultra", 400, "Holzschrift & Western", "Ultra"], ["sancreek", 400, "Holzschrift & Western", "Sancreek"],
  ["smokum", 400, "Holzschrift & Western", "Smokum"], ["diplomata-sc", 400, "Holzschrift & Western", "Diplomata SC"], ["germania-one", 400, "Holzschrift & Western", "Germania One"], ["almendra-display", 400, "Holzschrift & Western", "Almendra Display"],
  ["shrikhand", 400, "70er & Groovy", "Shrikhand"], ["chango", 400, "70er & Groovy", "Chango"], ["righteous", 400, "70er & Groovy", "Righteous"], ["bagel-fat-one", 400, "70er & Groovy", "Bagel Fat One"], ["lily-script-one", 400, "70er & Groovy", "Lily Script One"],
  ["cinzel-decorative", 900, "Elegant", "Cinzel Decorative"], ["limelight", 400, "Elegant", "Limelight"], ["gloock", 400, "Elegant", "Gloock"], ["abril-fatface", 400, "Elegant", "Abril Fatface"], ["pinyon-script", 400, "Elegant", "Pinyon Script"],
  ["luckiest-guy", 400, "Comic & Handgemacht", "Luckiest Guy"], ["bangers", 400, "Comic & Handgemacht", "Bangers"]
];
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?&-–'\"()/@#%+*=€$äöüÄÖÜß";
const browser = await chromium.launch(), page = await browser.newPage();
await page.setContent("<!doctype html><meta charset=utf8><body>");
await page.addScriptTag({ path: path.join(repo, "vendor/opentype.min.js") });
await page.addScriptTag({ path: path.join(repo, "fontmatch.js") });
const index = [];
for (const [id, w, group, family] of PICKS) {
  const file = path.join(woffDir, `${id}-${w}.woff`);
  if (!fs.existsSync(file)) { console.warn("fehlt", file); continue; }
  const res = await page.evaluate(({ b64, CHARS }) => {
    const font = opentype.parse(Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer);
    const glyphs = FontMatch.fontGlyphs(font, CHARS);
    const sp = font.charToGlyph(" "), H = font.charToGlyph("H");
    const cap = H && H.index ? H.getBoundingBox().y2 : font.unitsPerEm * 0.7;
    return { glyphs, space: Math.round((sp?.advanceWidth || font.unitsPerEm * 0.28) * 700 / cap) };
  }, { b64: fs.readFileSync(file).toString("base64"), CHARS });
  fs.writeFileSync(path.join(repo, "fonts/flyer", id + ".json"), JSON.stringify({ id, family, w, ...res }));
  const pv = ["A", "b", "c"].map(ch => res.glyphs[ch] || res.glyphs[ch.toUpperCase()]).filter(Boolean);
  let x = 0; const d = pv.map(g => { const t = `<path transform="translate(${x} 0)" d="${g.d}"/>`; x += g.w; return t; }).join("");
  index.push({ id, family, w, group, pw: x, pv: d });
  console.log(id, Object.keys(res.glyphs).length, "Zeichen", (fs.statSync(path.join(repo, "fonts/flyer", id + ".json")).size / 1024).toFixed(0) + " KB");
}
fs.writeFileSync(path.join(repo, "fonts/flyer/index.json"), JSON.stringify(index));
await browser.close();
