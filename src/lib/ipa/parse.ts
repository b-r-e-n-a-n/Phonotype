// src/lib/ipa/parse.ts
import { normalizeToNFD } from "./normalize";

/** A phonetic segment = base char + any following combining diacritics. */
export type Segment = { base: string; diacritics: string[] };

const COMBINING = /\p{M}/u;

/**
 * Example:
 *   "pʰã" -> [{base:"p", diacritics:["ʰ"]}, {base:"a", diacritics:["̃"]}]
 *   "t͡ʃ"  -> [{base:"t", diacritics:["͡","ʃ"]}]  // tie+second base attaches; we’ll refine later
 */
export function segmentIPA(raw: string): Segment[] {
  const nfd = normalizeToNFD(raw);
  const out: Segment[] = [];
  let current: Segment | null = null;

  for (let i = 0; i < nfd.length; i++) {
    const ch = nfd[i]!;

    // treat spaces and common punctuation as their own “segments”
    // so we preserve boundaries cleanly
    if (isBoundary(ch)) {
      current = null;
      out.push({ base: ch, diacritics: [] });
      continue;
    }

    if (!current || !COMBINING.test(ch)) {
      // start a new segment on a non-combining char
      current = { base: ch, diacritics: [] };
      out.push(current);
    } else {
      // attach combining mark to the current segment
      current.diacritics.push(ch);
    }
  }

  return out;
}

function isBoundary(ch: string): boolean {
  // mirror SAFE_PUNCT plus slashes/brackets if you added them in validate.ts
  return ch === " " || ch === "." || ch === "," || ch === "'" || ch === "-" ||
         ch === "|" || ch === "‖" || ch === "/" || ch === "[" || ch === "]";
}
