# Only Bad Designs (Beta)

Bild rein, Vektor raus – ein Werkzeug im Browser, ganz ohne KI.

- **Vektorisieren:** Bilder exakt als SVG nachzeichnen, Farben ändern, verformen, Buchstaben als Schrift übernehmen.
- **Schrift:** Bild mit Schrift hochladen – das Tool erkennt die Buchstaben, vergleicht sie mit rund 1.900 freien Schriften aus Google Fonts und lädt die ähnlichsten direkt ins Tool.
- **Entwürfe:** alles Gespeicherte bearbeiten (Farben, Hintergrund, Stil) und exportieren.
- **Komposition:** Entwürfe und Schriften zu Flyern und Postern zusammensetzen, Export als SVG/PNG.

Alle Daten bleiben im Browser (localStorage). Über **Daten → Alles sichern** lässt sich ein Stand als JSON exportieren und in einem anderen Browser wieder laden.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html` | die komplette App |
| `fontmatch.js` | Merkmale für den Schriftvergleich (gleiche Rechnung beim Index-Bau und in der App) |
| `fonts/catalog.json`, `fonts/index.bin` | Such-Index: 16 × 16-Raster aller Zeichen A–Z, a–z, 0–9 je Schriftschnitt |
| `vendor/opentype.min.js` | [opentype.js](https://github.com/opentypejs/opentype.js) 1.3.4 (MIT) |
| `scripts/build-font-index.mjs` | baut den Such-Index neu |

Die Schriftdateien selbst lädt die App bei Bedarf von [Fontsource](https://fontsource.org) über jsDelivr. Die Schriften stehen unter freien Lizenzen (meist SIL Open Font License), Details je Schrift auf fonts.google.com.

## Such-Index neu bauen

1. Die WOFF-Dateien als `<id>-<gewicht>.woff` in einen Ordner legen (z. B. aus den npm-Paketen `@fontsource/<id>`, Datei `files/<id>-latin-<gewicht>-normal.woff`).
2. `npm i playwright google-font-metadata`
3. `node scripts/build-font-index.mjs <woff-ordner> node_modules/google-font-metadata/data/google-fonts-v2.json`

Lokal testen: `python3 -m http.server` im Projektordner, dann http://localhost:8000 öffnen. Als einzelne Datei per Doppelklick geöffnet funktioniert die Schriftsuche nicht, weil der Browser den Index dann nicht laden darf.
