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
 */
export async function transcribeChunk(audio: Buffer): Promise<string> {
  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audio, {
    model: 'nova-3',
    language: 'en-US',
    smart_format: true,
    punctuate: true,
  });

  if (error) {
    throw new Error(error.message ?? 'Deepgram transcription failed');
  }

  const transcript =
    result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
  return transcript.trim();
}
