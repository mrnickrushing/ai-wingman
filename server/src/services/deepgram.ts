import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

/**
 * Transcribe a single, self-contained audio chunk (a complete container file
 * such as m4a/aac/wav/webm) using Deepgram's pre-recorded API.
 *
 * We intentionally do NOT use the live/streaming socket with a raw `linear16`
 * encoding here: the mobile client (expo-av) cannot produce raw PCM on Android,
 * and shipping discrete container files into a raw-PCM stream corrupted the
 * audio. Deepgram auto-detects the codec from the container header, so this
 * path works identically on iOS and Android.
 *
 * Noise / quality tuning for loud environments (restaurants, bars, conferences):
 * - `smart_format` + `punctuate` give cleaner, better-segmented text.
 * - `filler_words: false` strips "um/uh" disfluencies so the transcript handed
 *   to Claude is tighter and the coach reasons over content, not noise.
 * - `keyterm` boosts mode-specific jargon (e.g. "anchor", "counter-offer")
 *   so domain terms survive a noisy room.
 *
 * NOTE: `endpointing`, `utterance_end_ms`, `interim_results`, and
 * `disfluencies` are LIVE-streaming-only options on Deepgram's WebSocket API.
 * They are NOT valid on this pre-recorded (`transcribeFile`) path — this client
 * ships discrete container files per chunk rather than a raw PCM stream (see
 * the comment above), so those flags would be silently ignored here. If we ever
 * migrate back to the live socket, set them there for lower perceived latency.
 */
export async function transcribeChunk(
  audio: Buffer,
  keywords: string[] = []
): Promise<string> {
  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audio, {
    model: 'nova-3',
    language: 'en-US',
    smart_format: true,
    punctuate: true,
    // Drop "um/uh"-style fillers from the returned transcript.
    filler_words: false,
    ...(keywords.length > 0 ? { keyterm: keywords } : {}),
  });

  if (error) {
    throw new Error(error.message ?? 'Deepgram transcription failed');
  }

  const transcript =
    result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
  return transcript.trim();
}
