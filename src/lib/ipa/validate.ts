// src/lib/ipa/validate.ts
import { normalizeToNFD } from "./normalize";

export type ValidationIssue = {
  index: number;
  char: string;
  message: string;
};

const RE = {
  // Combining marks (any) — used for diacritics
  COMBINING: /\p{M}/u,

  // Whitelist of major IPA-related blocks and needed symbols.
  // We allow: ASCII & Latin, IPA Ext, Phonetic Ext, Spacing Modifiers,
  // Combining Diacritics (+ Extended + Supplement), Punctuation used in IPA,
  // Modifier Tone Letters, and specific click letters.
  ALLOWED: new RegExp(
    [
      "\\u0020-\\u007E",       // Basic Latin (incl. space + simple punct)
      "\\u00A0-\\u024F",       // Latin-1 + Latin Extended A/B
      "\\u0250-\\u02AF",       // IPA Extensions
      "\\u02B0-\\u02FF",       // Spacing Modifier Letters (aspiration ʰ, length ː, etc.)
      "\\u0300-\\u036F",       // Combining Diacritics
      "\\u1AB0-\\u1AFF",       // Combining Diacritics Extended
      "\\u1DC0-\\u1DFF",       // Combining Diacritics Supplement
      "\\u1D00-\\u1D7F",       // Phonetic Extensions
      "\\u1D80-\\u1DBF",       // Phonetic Extensions Supplement
      "\\u1E00-\\u1EFF",       // Latin Extended Additional (precomposed letters sometimes appear)
      "\\u2000-\\u206F",       // General Punctuation (we will still restrict actual usage below)
      "\\u02E5-\\u02E9",       // Chao tone letters ˥ ˦ ˧ ˨ ˩
      "\\uA700-\\uA71F",       // Modifier Tone Letters (extended tone marks)
      // Specific important characters that may fall outside the broad buckets:
      "\\u0361",               // combining double inverted breve (tie bar above)
      "\\u035C",               // combining double breve below (tie bar below)
      "\\u2016"                // ‖ (double vertical line, major break)
    ].join(""),
    "u"
  ),
};

// Common suprasegmentals as explicit sets
const STRESS_PRIMARY = "\u02C8";  // ˈ
const STRESS_SECONDARY = "\u02CC"; // ˌ
const LENGTH_LONG = "\u02D0";     // ː
const LENGTH_HALF = "\u02D1";     // ˑ

// A few ASCII/spacing chars we permit in IPA strings
const SAFE_PUNCT = new Set([" ", ".", ",", "'", "-", "|", "‖"]);

// Minimal vowel set for simple context checks (expand later)
const VOWELS = new Set([
  "i","y","ɨ","ʉ","ɯ","u","ɪ","ʏ","ʊ",
  "e","ø","ɘ","ɵ","ɤ","o","ə",
  "ɛ","œ","ɜ","ɞ","ʌ","ɔ",
  "æ","ɐ","a","ɶ","ɑ","ɒ"
]);

export function validateIPA(raw: string): {
  ok: boolean;
  issues: ValidationIssue[];
  cleaned: string;
} {
  const nfd = normalizeToNFD(raw ?? "").trim();
  const issues: ValidationIssue[] = [];

  if (!nfd) {
    return { ok: false, issues: [{ index: 0, char: "", message: "Empty input" }], cleaned: "" };
  }

  // 1) Character whitelist
  for (let i = 0; i < nfd.length; i++) {
    const ch = nfd[i]!;
    if (!RE.ALLOWED.test(ch)) {
      issues.push({ index: i, char: ch, message: "Unsupported character (not IPA or related mark)" });
    }
  }

  // 2) Simple illegal starts
  const first = nfd[0]!;
  if (RE.COMBINING.test(first)) {
    issues.push({ index: 0, char: first, message: "Cannot start with a combining diacritic" });
  }
  // Leading stress is OK only if it immediately precedes a syllable (not space/punct/end).
if (first === STRESS_PRIMARY || first === STRESS_SECONDARY) {
  const second = nfd[1] ?? "";

  if (!second) {
    issues.push({
      index: 0,
      char: first,
      message: "Stress mark cannot be the only/last character"
    });
  } else if (SAFE_PUNCT.has(second)) {
    issues.push({
      index: 0,
      char: first,
      message: "Stress mark cannot be followed by space or punctuation"
    });
  } else if (second === STRESS_PRIMARY || second === STRESS_SECONDARY) {
    issues.push({
      index: 1,
      char: second,
      message: "Consecutive stress marks are not allowed"
    });
  }
}
  if (first === LENGTH_LONG || first === LENGTH_HALF) {
    issues.push({ index: 0, char: first, message: "Length mark must follow a symbol" });
  }

  // 3) Context checks (lightweight, phase 1)
  //    - No combining marks immediately after space/punctuation.
  //    - Length marks must follow a non-combining symbol.
  //    - Two stress marks in a row is illegal.
  //    - Basic tone letters (˥˦˧˨˩) should follow a vowel (loose rule).
  for (let i = 0; i < nfd.length; i++) {
    const ch = nfd[i]!;
    const prev = i > 0 ? nfd[i - 1]! : "";

    // 3a) Combining mark cannot follow space/punct or be first
    if (RE.COMBINING.test(ch)) {
      if (i === 0 || SAFE_PUNCT.has(prev)) {
        issues.push({ index: i, char: ch, message: "Diacritic must attach to a preceding base symbol" });
      }
    }

    // 3b) Length must follow a base (not combining, not punct)
    if (ch === LENGTH_LONG || ch === LENGTH_HALF) {
      if (i === 0 || RE.COMBINING.test(prev) || SAFE_PUNCT.has(prev)) {
        issues.push({ index: i, char: ch, message: "Length mark must follow a base symbol" });
      }
    }

    // 3c) Double stress (ˈˈ or ˌˌ or ˈˌ etc.) is suspicious
    if (ch === STRESS_PRIMARY || ch === STRESS_SECONDARY) {
      if (prev === STRESS_PRIMARY || prev === STRESS_SECONDARY) {
        issues.push({ index: i, char: ch, message: "Consecutive stress marks are not allowed" });
      }
    }

    // 3d) Tone letters ˥ ˦ ˧ ˨ ˩ should generally follow a vowel (very permissive)
    if (/[\u02E5-\u02E9]/u.test(ch)) {
      if (i === 0 || (!VOWELS.has(prev) && !RE.COMBINING.test(prev))) {
        // If previous isn’t a vowel or vowel+combining, warn.
        issues.push({ index: i, char: ch, message: "Tone letter should follow a vowel segment" });
      }
    }
  }

  return { ok: issues.length === 0, issues, cleaned: nfd };
}
