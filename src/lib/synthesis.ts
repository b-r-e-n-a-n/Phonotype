// src/lib/synthesis.ts
import { validateIPA } from "./ipa/validate";
import { segmentIPA } from "./ipa/parse";
import { checkCapabilities } from "./ipa/phoneset";

export type SynthesisOk = { ok: true; audio: ArrayBuffer; notes?: string[] };
export type SynthesisErr = { ok: false; error: string; issues?: string[] };
export type SynthesisResult = SynthesisOk | SynthesisErr;

/**
 * For now: simulate audio with a short silent WAV so the UI can exercise playback.
 * Next: replace the silent wav with a real TTS call (e.g., /api/tts).
 */
export async function synthesizeIPA(input: string): Promise<SynthesisResult> {
  // 1) Validate
  const v = validateIPA(input);
  if (!v.ok) {
    return {
      ok: false,
      error: "Validation failed",
      issues: v.issues.map(i => `${i.index}:${i.char ? `"${i.char}" ` : ""}${i.message}`)
    };
  }

  // 2) Segment
  const segs = segmentIPA(v.cleaned);

  // 3) Capability check (which symbols we currently support)
  const cap = checkCapabilities(segs);
  const notes =
    cap.unsupported.length > 0
      ? cap.unsupported.map(u => `Unsupported ${u.kind} "${u.symbol}" at segment ${u.index}`)
      : undefined;

  // 4) Produce a tiny silent WAV (200ms @ 16kHz) so the player has audio to play
  const audio = makeSilentWav(0.2, 16000);

  return { ok: true, audio, notes };
}

/** ---- helpers ---- **/

function makeSilentWav(seconds: number, sampleRate: number): ArrayBuffer {
  const numSamples = Math.max(1, Math.floor(seconds * sampleRate));
  const bytesPerSample = 2; // 16-bit mono PCM
  const dataSize = numSamples * bytesPerSample;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeASCII(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeASCII(view, 8, "WAVE");

  // fmt  chunk
  writeASCII(view, 12, "fmt ");
  view.setUint32(16, 16, true);  // PCM header size
  view.setUint16(20, 1, true);   // PCM format
  view.setUint16(22, 1, true);   // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true);              // block align
  view.setUint16(34, 8 * bytesPerSample, true);          // bits per sample

  // data chunk
  writeASCII(view, 36, "data");
  view.setUint32(40, dataSize, true);
  // samples are zeroed by default (silence)

  return buffer;
}

function writeASCII(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
