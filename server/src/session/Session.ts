import { WebSocket } from 'ws';
import { LiveClient } from '@deepgram/sdk';
import { createDeepgramStream } from '../services/deepgram';
import { generateSalesCoaching } from '../services/claude';
import { textToSpeech } from '../services/elevenlabs';
import { SessionConfig, ServerMessage, ConversationTurn } from '../types';

export class Session {
  readonly id: string;
  private deepgram: LiveClient;
  private history: ConversationTurn[] = [];
  private isCoaching = false;
  private wordCount = { self: 0, other: 0 };

  constructor(
    id: string,
    private ws: WebSocket,
    private config: SessionConfig
  ) {
    this.id = id;
    this.deepgram = createDeepgramStream((text, isFinal) => {
      this.send({ type: 'transcript', text, isFinal });
      if (isFinal) {
        this.wordCount.self += text.split(' ').length;
        this.triggerCoaching(text);
      }
    });
  }

  receiveAudio(base64Chunk: string): void {
    const buf = Buffer.from(base64Chunk, 'base64');
    // Deepgram SDK expects ArrayBuffer, not Node Buffer
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    this.deepgram.send(arrayBuffer);
  }

  private async triggerCoaching(transcript: string): Promise<void> {
    if (this.isCoaching || !transcript.trim()) return;
    this.isCoaching = true;

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
    try {
      this.deepgram.requestClose();
    } catch {
      // already closed
    }
  }
}
