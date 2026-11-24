import atlasJson from "./og-atlas.json";

type Glyph = { w: number; h: number; advance: number; rle: string };
type Face = { size: number; ascent: number; glyphs: Record<string, Glyph> };

const atlas = atlasJson as { display: Face; body: Face; label: Face };

function decode(rle: string): Uint8Array {
  const raw = Uint8Array.from(atob(rle), (char) => char.charCodeAt(0));
  const out: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const count = raw[i] ?? 0;
    const value = raw[i + 1] ?? 0;
    for (let n = 0; n < count; n += 1) out.push(value);
  }
  return Uint8Array.from(out);
}

const glyphCache = new Map<string, Uint8Array>();

function pixels(face: Face, ch: string): { glyph: Glyph; alpha: Uint8Array } | null {
  const glyph = face.glyphs[ch] ?? face.glyphs[" "];
  if (!glyph) return null;
  const key = `${face.size}:${ch}`;
  let alpha = glyphCache.get(key);
  if (!alpha) {
    alpha = decode(glyph.rle);
    glyphCache.set(key, alpha);
  }
  return { glyph, alpha };
}

function blitText(
  image: Uint8ClampedArray,
  width: number,
  face: Face,
  text: string,
  x: number,
  baseline: number,
  color: [number, number, number],
) {
  let cursor = x;
  for (const ch of text) {
    const painted = pixels(face, ch);
    if (!painted) continue;
    const top = baseline - face.ascent;
    const { glyph, alpha } = painted;
    for (let gy = 0; gy < glyph.h; gy += 1) {
      const dy = top + gy;
      if (dy < 0 || dy >= image.length / (width * 4)) continue;
      for (let gx = 0; gx < glyph.w; gx += 1) {
        const dx = cursor + gx;
        if (dx < 0 || dx >= width) continue;
        const cover = (alpha[gy * glyph.w + gx] ?? 0) / 255;
        if (cover <= 0) continue;
        const index = (dy * width + dx) * 4;
        image[index] = Math.round(image[index]! * (1 - cover) + color[0] * cover);
        image[index + 1] = Math.round(image[index + 1]! * (1 - cover) + color[1] * cover);
        image[index + 2] = Math.round(image[index + 2]! * (1 - cover) + color[2] * cover);
        image[index + 3] = 255;
      }
    }
    cursor += glyph.advance;
  }
}

function fill(image: Uint8ClampedArray, width: number, x: number, y: number, w: number, h: number, color: [number, number, number]) {
  const height = image.length / (width * 4);
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(width, x + w);
  const y1 = Math.min(height, y + h);
  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) {
      const index = (yy * width + xx) * 4;
      image[index] = color[0];
      image[index + 1] = color[1];
      image[index + 2] = color[2];
      image[index + 3] = 255;
    }
  }
}

export function paintCard(lines: { eyebrow: string; title: string; line: string; foot: string }): Uint8ClampedArray {
  const width = 1200;
  const height = 630;
  const image = new Uint8ClampedArray(width * height * 4);
  fill(image, width, 0, 0, width, height, [12, 11, 10]);
  fill(image, width, 0, 0, 28, height, [228, 196, 138]);
  fill(image, width, 72, 168, 180, 8, [228, 196, 138]);
  blitText(image, width, atlas.label, lines.eyebrow, 72, 130, [228, 196, 138]);
  blitText(image, width, atlas.display, lines.title.slice(0, 28), 72, 280, [246, 241, 232]);
  blitText(image, width, atlas.body, lines.line.slice(0, 48), 72, 390, [228, 196, 138]);
  blitText(image, width, atlas.body, lines.foot.slice(0, 48), 72, 500, [179, 168, 156]);
  return image;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const body = new Uint8Array(4 + data.length);
  body.set(new TextEncoder().encode(type), 0);
  body.set(data, 4);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(body, 4);
  view.setUint32(8 + data.length, crc32(body));
  return out;
}

export async function encodePng(width: number, height: number, rgba: Uint8ClampedArray): Promise<Uint8Array> {
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const row = y * (1 + width * 4);
    raw[row] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), row + 1);
  }
  const stream = new CompressionStream("deflate");
  const compressed = await new Response(new Blob([raw]).stream().pipeThrough(stream)).arrayBuffer();
  const ihdr = new Uint8Array(13);
  const header = new DataView(ihdr.buffer);
  header.setUint32(0, width);
  header.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [signature, chunk("IHDR", ihdr), chunk("IDAT", new Uint8Array(compressed)), chunk("IEND", new Uint8Array())];
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const png = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

export async function cardPng(lines: { eyebrow: string; title: string; line: string; foot: string }): Promise<Uint8Array> {
  return encodePng(1200, 630, paintCard(lines));
}
