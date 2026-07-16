import { createClient, LiveTranscriptionEvents, type LiveSchema, type LiveTranscriptionEvent } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

type LiveTranscriptHandler = (payload: { text: string; isFinal: boolean }) => void;

export class DeepgramLiveTranscriber {
  private connection: ReturnType<typeof deepgram.listen.live> | null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private healthy = true;
  private finalized = false;

  constructor(
    keywords: string[] = [],
    audio: { sampleRate: number; channels: number } = { sampleRate: 16000, channels: 1 },
    private onTranscript: LiveTranscriptHandler,
    private onError: (message: string) => void
  ) {
    const options: LiveSchema = {
      model: 'nova-3',
      language: 'en-US',
      encoding: 'linear16',
      sample_rate: audio.sampleRate,
      channels: audio.channels,
      smart_format: true,
      punctuate: true,
      filler_words: false,
      interim_results: true,
      no_delay: true,
      endpointing: 250,
      utterance_end_ms: 900,
      ...(keywords.length > 0 ? { keyterm: keywords } : {}),
    };

    this.connection = deepgram.listen.live(options);
    this.connection.on(LiveTranscriptionEvents.Open, () => {
      this.healthy = true;
    });
    this.connection.on(LiveTranscriptionEvents.Transcript, (event: LiveTranscriptionEvent) => {
      const text = event.channel?.alternatives?.[0]?.transcript?.trim() ?? '';
      if (!text) return;
      this.onTranscript({ text, isFinal: Boolean(event.is_final || event.speech_final || event.from_finalize) });
    });
    this.connection.on(LiveTranscriptionEvents.Error, (event: unknown) => {
      this.healthy = false;
      const message =
        event instanceof Error
          ? event.message
          : typeof event === 'object' && event && 'message' in event && typeof (event as { message?: unknown }).message === 'string'
            ? (event as { message: string }).message
            : 'Live transcription failed';
      if (!this.finalized) this.onError(message);
    });
    this.connection.on(LiveTranscriptionEvents.Close, () => {
      this.healthy = false;
      if (!this.finalized) this.onError('Live transcription stream closed unexpectedly.');
    });

    this.keepAliveTimer = setInterval(() => {
      if (this.healthy) {
        try {
          this.connection?.keepAlive();
        } catch {
          this.healthy = false;
        }
      }
    }, 4000);
  }

  send(audio: Buffer): boolean {
    if (!this.healthy || !this.connection) return false;
    try {
      const payload = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength);
      this.connection.send(payload);
      return true;
    } catch {
      this.healthy = false;
      return false;
    }
  }

  finalize(): void {
    this.finalized = true;
    try {
      this.connection?.finalize();
    } catch {
      // best effort flush
    }
  }

  async close(): Promise<void> {
    this.finalized = true;
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    try {
      this.connection?.requestClose();
    } catch {
      // best effort close
    }
    this.connection = null;
  }

  get isHealthy(): boolean {
    return this.healthy && Boolean(this.connection);
  }
}

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
  keywords: string[] = [],
  signal?: AbortSignal
): Promise<string> {
  const requestClient = signal
    ? createClient(process.env.DEEPGRAM_API_KEY!, {
        global: { fetch: { options: { signal } } },
      })
    : deepgram;
  const { result, error } = await requestClient.listen.prerecorded.transcribeFile(audio, {
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
