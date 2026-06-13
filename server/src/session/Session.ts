import { WebSocket } from 'ws';
import { transcribeChunk } from '../services/deepgram';
import { generateSalesCoaching } from '../services/claude';
import { textToSpeech } from '../services/elevenlabs';
import { SessionConfig, ServerMessage, ConversationTurn } from '../types';

export class Session {
  readonly id: string;
  private history: ConversationTurn[] = [];
  private isCoaching = false;
  private wordCount = 0;
  private latestTranscript = '';
  private coachedTranscript = '';

  constructor(
    id: string,
    private ws: WebSocket,
    private config: SessionConfig
  ) {
    this.id = id;
  }

  /**
   * Receive a self-contained audio chunk (base64-encoded container file),
   * transcribe it, surface the transcript, and trigger coaching.
   */
  async receiveAudio(base64Chunk: string): Promise<void> {
    if (!base64Chunk) return;

    let buf: Buffer;
    try {
      buf = Buffer.from(base64Chunk, 'base64');
    } catch {
      return;
    }
    // Skip empty / near-silent segments that are too small to contain speech.
    if (buf.byteLength < 1024) return;

    let text = '';
    try {
      text = await transcribeChunk(buf);
    } catch (err) {
      console.error(`[Session ${this.id}] Transcription error:`, (err as Error).message);
      return;
    }
    if (!text) return;

    this.wordCount += text.split(/\s+/).filter(Boolean).length;
    // Always surface the transcript to the client, even while a coaching
    // request is already in flight, so the UI never loses words.
    this.send({ type: 'transcript', text, isFinal: true });

    this.latestTranscript = text;
    void this.maybeCoach();
  }

  /**
   * Single-flight coaching: only one Claude+TTS round-trip runs at a time.
   * If newer speech arrived while we were busy, we re-run for the latest line
   * instead of silently dropping it.
   */
  private async maybeCoach(): Promise<void> {
    if (this.isCoaching) return;
    const transcript = this.latestTranscript;
    if (!transcript.trim()) return;

    this.isCoaching = true;
    this.coachedTranscript = transcript;
    try {
      const coaching = await generateSalesCoaching(
        transcript,
        this.config.prospectContext ?? '',
        this.config.callGoal ?? '',
        this.config.objectionLibrary ?? '',
        this.history
      );

      if (coaching && coaching !== 'HOLD') {
        this.history.push(
          { role: 'user', content: `Transcript: "${transcript}"` },
          { role: 'assistant', content: coaching }
        );

        this.send({ type: 'coaching', text: coaching });
        await this.sendAudio(coaching);
      }
    } catch (err) {
      console.error(`[Session ${this.id}] Coaching error:`, err);
    } finally {
      this.isCoaching = false;
      // New speech came in while we were coaching — coach on it now.
      if (this.latestTranscript !== this.coachedTranscript) {
        void this.maybeCoach();
      }
    }
  }

  private async sendAudio(text: string): Promise<void> {
    if (!process.env.ELEVENLABS_API_KEY) return;
    try {
      const audio = await textToSpeech(text);
      this.send({
        type: 'coaching_audio',
        audio: audio.toString('base64'),
        mimeType: 'audio/mpeg',
      });
    } catch (err) {
      console.error(`[Session ${this.id}] TTS error:`, err);
    }
  }

  private send(message: ServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  end(): void {
    // No persistent upstream connection to close in the per-chunk model.
  }
}
