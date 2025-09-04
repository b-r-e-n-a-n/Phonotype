// src/lib/ipa/normalize.ts
/**
 * Normalize to NFD for stable combining-mark handling.
 * Use NFC when you need display-ready strings.
 */
export function normalizeToNFD(input: string): string {
  return (input ?? "").normalize("NFD");
}

export function normalizeToNFC(input: string): string {
  return (input ?? "").normalize("NFC");
}
