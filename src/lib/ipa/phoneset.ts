// src/lib/ipa/phoneset.ts
import type { Segment } from "./parse";

/** Base phones we claim to handle for now (grow over time). */
export const SUPPORTED_BASES = new Set<string>([
  // Vowels (core set)
  "i","e","a","o","u","ɪ","ʊ","ɛ","ɔ","ə","æ","ɑ","ɒ","y","ø","œ","ɨ","ɯ","ɤ",
  // Consonants (core set)
  "p","b","t","d","k","g","m","n","ŋ","f","v","s","z","ʃ","ʒ","h","x","ç","ʝ",
  "l","r","ɾ","ʀ","j","w","θ","ð","ʈ","ɖ","ɟ","ɡ","q","ɢ","ɣ","ɬ","ɮ"
]);

/**
 * Combining diacritics we accept (attach to a base in NFD):
 * – voicing/phonation, rounding, position, ATR, dental/apical/laminal,
 * – nasality, no audible release, ring (voiceless), tie bars,
 * – tone diacritics (acute/grave/macron/etc.), centralized, diaeresis.
 */
export const SUPPORTED_DIACRITICS = new Set<string>([
  // your list + common IPA
  "̥","̬","ʰ","̹","̜","̟","̠","̈","̽","̩","̯","˞","ʷ","ʲ","ˠ","ˤ","̴","̝","̞","̘","̙","̪","̺","̻","̃","̚","̊","͡",
  // extras you’ll likely want too
  "͜",        // tie bar below
  "̤",        // breathy voiced
  "̰",        // creaky voiced
  // tone DIACRITICS (combining)
  "́","̀","̄","̌","̂","̋","̏" // acute, grave, macron, caron, circumflex, double acute, double grave
]);

/**
 * Spacing modifier letters that behave like diacritics but are NOT combining.
 * (The parser will see these as separate “bases,” so allow them explicitly.)
 */
export const SPACING_MODIFIERS = new Set<string>([
  "ʰ","ʷ","ʲ","ˠ","ˤ","ː","ˑ","˞", // aspiration, labialization, palatalization, velar/pharyngeal, length, rhoticity
  "˥","˦","˧","˨","˩"             // tone LETTERS (Chao)
]);

export type CapabilityItem = {
  index: number;  // segment index
  symbol: string;
  kind: "base" | "diacritic";
};

export type CapabilityReport = { unsupported: CapabilityItem[] };

/** Treat obvious punctuation/spacing as boundaries we ignore in capability checks. */
const BOUNDARY = /[\s.,'\-|‖/[\]]/;

/**
 * Walk segments and report anything outside our starter phoneset.
 * - Punctuation/space segments are ignored.
 * - Spacing modifiers (ʰ, ʷ, ʲ, ː, ˥…˩, etc.) are allowed even though they’re “bases”.
 */
export function checkCapabilities(segments: Segment[]): CapabilityReport {
  const unsupported: CapabilityItem[] = [];

  segments.forEach((seg, i) => {
    // Skip boundaries entirely
    if (BOUNDARY.test(seg.base)) return;

    // Allow spacing modifier letters as “diacritic-like bases”
    if (!SUPPORTED_BASES.has(seg.base) && !SPACING_MODIFIERS.has(seg.base)) {
      unsupported.push({ index: i, symbol: seg.base, kind: "base" });
    }
    for (const d of seg.diacritics) {
      if (!SUPPORTED_DIACRITICS.has(d)) {
        unsupported.push({ index: i, symbol: d, kind: "diacritic" });
      }
    }
  });

  return { unsupported };
}
