/**
 * Gera public/logo.svg: símbolo Cúpula do Forno & Assadeira (#1D449B) +
 * wordmark "fornada" em Fraunces peso 700 (SOFT=50, opsz=36, WONK=0, convertido em curvas).
 *
 * Uso: node scripts/build-logo.mjs
 * Fonte variável @fontsource-variable/fraunces (SIL OFL 1.1) em node_modules.
 * O SVG final não depende de fonte instalada nem externa.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
import wawoff2 from 'wawoff2';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fontPath = path.join(root, 'node_modules', '@fontsource-variable', 'fraunces', 'files', 'fraunces-latin-full-normal.woff2');
const symbolPath = path.join(root, 'brand', 'rebranding-a', 'symbol.svg');

const SIZE = 34;
const BASELINE = 33.5;
const X0 = 38;
const TRACKING = -0.03 * SIZE;
const BLUE = '#1D449B';
const INK = '#161D2B';

const ttf = await wawoff2.decompress(await readFile(fontPath));
const font = fontkit.create(ttf).getVariation({ wght: 700, SOFT: 50, opsz: 36, WONK: 0 });
const scale = SIZE / font.unitsPerEm;
const run = font.layout('fornada');

const paths = [];
let x = X0;
let maxX = X0;

for (let i = 0; i < run.glyphs.length; i++) {
  const glyph = run.glyphs[i];
  const pos = run.positions[i];
  const gx = x + pos.xOffset * scale;
  const gy = BASELINE - pos.yOffset * scale;
  const transformed = glyph.path.transform(scale, 0, 0, -scale, gx, gy);
  const d = transformed.toSVG();
  if (d) paths.push(d);
  const advance = pos.xAdvance * scale;
  if (i === run.glyphs.length - 1) {
    maxX = Math.max(x + advance, transformed.bbox?.maxX ?? x + advance);
  }
  x += advance + (i < run.glyphs.length - 1 ? TRACKING : 0);
}

const symbolRaw = await readFile(symbolPath, 'utf8');
const symbolInner = symbolRaw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();

const width = Number((maxX + 2).toFixed(2));
const height = 42;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="brand-title">
<title id="brand-title">Fornada</title>
<metadata>Fornada lockup (Louça &amp; Forno). Wordmark letterforms from Fraunces 700 (SOFT 50, opsz 36, WONK 0), SIL Open Font License 1.1, converted to outlines. No external font dependency.</metadata>
<g fill="${BLUE}" transform="translate(0 7.5)">${symbolInner}</g>
<path fill="${INK}" d="${paths.join('')}"/>
</svg>
`;

const outPath = path.join(root, 'public', 'logo.svg');
await writeFile(outPath, svg, 'utf8');
console.log(`logo.svg ${width}x${height} (${Buffer.byteLength(svg)} bytes)`);
