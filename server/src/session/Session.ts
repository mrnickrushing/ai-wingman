import { WebSocket } from 'ws';
import { DeepgramLiveTranscriber, transcribeChunk } from '../services/deepgram';
import {
  generateSalesCoaching,
  generateDatingCoaching,
  generateNetworkingCoaching,
  generatePitchingCoaching,
  generateRoleplayTurn,
  summarizeConversation,
  generateHardConversationCoaching,
} from '../services/claude';
import { textToSpeech } from '../services/elevenlabs';
import { SessionConfig, ServerMessage, ConversationTurn } from '../types';

// --- Rolling context window tuning -------------------------------------------
// Keep the most recent KEEP_RECENT_TURNS turns verbatim; everything older is
// folded into a running summary. A "turn" here is one entry in `history`
// (user transcript or assistant coaching), so a single coaching exchange is 2.
const KEEP_RECENT_TURNS = 20;
// Re-summarize at most once every RESUMMARIZE_EVERY new turns to avoid paying
// for a summary call on every single exchange.
const RESUMMARIZE_EVERY = 20;
// Rough token budget. We estimate ~4 chars/token; if the assembled context
// would blow past this we force a resummary regardless of turn count.
const MAX_CONTEXT_TOKENS = 80_000;
const CHARS_PER_TOKEN = 4;
const RECENT_TRANSCRIPT_TURNS = 10;
const MIN_COACH_INTERVAL_MS = 1200;
const MAX_COACH_SILENCE_MS = 10_000;
const MIN_NEW_WORDS_FOR_COACH = 2;
const PCM_SAMPLE_RATE = 16000;
const PCM_CHANNELS = 1;
const PCM_BITS_PER_SAMPLE = 16;

function wrapPcmInWav(pcm: Buffer, sampleRate = PCM_SAMPLE_RATE, channels = PCM_CHANNELS): Buffer {
  const byteRate = sampleRate * channels * (PCM_BITS_PER_SAMPLE / 8);
  const blockAlign = channels * (PCM_BITS_PER_SAMPLE / 8);
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.byteLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(PCM_CHANNELS, 22);
  header.writeUInt32LE(PCM_SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(PCM_BITS_PER_SAMPLE, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.byteLength, 40);

  return Buffer.concat([header, pcm]);
}

export class Session {
  readonly id: string;
  private history: ConversationTurn[] = [];
  private isCoaching = false;
  private wordCount = 0;
  private latestTranscript = '';
  private coachedTranscript = '';
  private transcriptSinceCoach: string[] = [];
  private lastCoachAttemptAt = 0;
  private lastTipAt = Date.now();
  private liveTranscriber: DeepgramLiveTranscriber | null = null;
  private liveTranscriberRate = PCM_SAMPLE_RATE;
  private liveTranscriberChannels = PCM_CHANNELS;
  private transcriptionMode: 'live' | 'chunked' = 'live';

  // --- Rolling context state (persists for the session lifetime) ---
  private rollingSummary = '';
  // Number of turns already absorbed into `rollingSummary`. Turns at indices
  // [0, summarizedUpTo) in `history` are represented by the summary.
  private summarizedUpTo = 0;
  // Turn count at the last summarization, so we only resummarize periodically.
  private lastSummaryAtTurn = 0;

  // --- TTS pipeline state ---
  // Coaching audio is generated chunk-by-chunk as Claude streams. Chunks are
  // queued here and drained by a single sequential worker so the spoken tips
  // play back in order and never overlap on the wire.
  private ttsQueue: string[] = [];
  private ttsDraining = false;

  constructor(
    id: string,
    private ws: WebSocket,
    private config: SessionConfig
  ) {
    this.id = id;
  }

  private ensureLiveTranscriber(sampleRate: number, channels: number): DeepgramLiveTranscriber {
    if (
      this.liveTranscriber
      && this.liveTranscriberRate === sampleRate
      && this.liveTranscriberChannels === channels
    ) {
      return this.liveTranscriber;
    }

    if (this.liveTranscriber) {
      void this.liveTranscriber.close();
    }

    this.liveTranscriberRate = sampleRate;
    this.liveTranscriberChannels = channels;
    this.liveTranscriber = new DeepgramLiveTranscriber(
      this.config.keywords ?? [],
      { sampleRate, channels },
      ({ text, isFinal }) => {
        if (!text.trim()) return;
        this.wordCount += isFinal ? text.split(/\s+/).filter(Boolean).length : 0;
        this.send({ type: 'transcript', text, isFinal });
        if (isFinal) {
          this.recordTranscript(text);
          this.transcriptSinceCoach.push(text);
          this.latestTranscript = this.buildRecentTranscriptWindow();
          void this.maybeCoach();
        }
      },
      (message) => {
        console.warn(`[Session ${this.id}] Live transcription fallback: ${message}`);
        this.transcriptionMode = 'chunked';
        void this.liveTranscriber?.close();
        this.liveTranscriber = null;
      }
    );
    return this.liveTranscriber;
  }

  /**
   * Receive a self-contained audio chunk (base64-encoded container file),
   * transcribe it, surface the transcript, and trigger coaching.
   */
  async receiveAudio(base64Chunk: string, mimeType?: string, sampleRate = PCM_SAMPLE_RATE, channels = PCM_CHANNELS): Promise<void> {
    if (!base64Chunk) return;

    let buf: Buffer;
    try {
      buf = Buffer.from(base64Chunk, 'base64');
    } catch {
      return;
    }
    // Skip empty / near-silent segments that are too small to contain speech.
    if (buf.byteLength < 1024) return;

    const isPcmStream = mimeType === 'audio/pcm';
    if (isPcmStream) {
      const live = this.ensureLiveTranscriber(sampleRate, channels);
      if (this.transcriptionMode === 'live' && live.isHealthy) {
        const sent = live.send(buf);
        if (sent) return;
        this.transcriptionMode = 'chunked';
        void live.close();
        this.liveTranscriber = null;
      }
      const wav = wrapPcmInWav(buf, sampleRate, channels);
      let text = '';
      try {
        text = await transcribeChunk(wav, this.config.keywords ?? []);
      } catch (err) {
        const msg = (err as Error).message ?? 'Transcription failed';
        console.error(`[Session ${this.id}] PCM transcription error:`, msg);
        this.send({ type: 'error', message: `Transcription error: ${msg}` });
        return;
      }
      if (!text) return;

      this.wordCount += text.split(/\s+/).filter(Boolean).length;
      this.send({ type: 'transcript', text, isFinal: true });
      this.recordTranscript(text);
      this.transcriptSinceCoach.push(text);
      this.latestTranscript = this.buildRecentTranscriptWindow();
      void this.maybeCoach();
      return;
    }

    let text = '';
    try {
      text = await transcribeChunk(buf, this.config.keywords ?? []);
    } catch (err) {
      const msg = (err as Error).message ?? 'Transcription failed';
      console.error(`[Session ${this.id}] Transcription error:`, msg);
      this.send({ type: 'error', message: `Transcription error: ${msg}` });
      return;
    }
    if (!text) return;

    this.wordCount += text.split(/\s+/).filter(Boolean).length;
    // Always surface the transcript to the client, even while a coaching
    // request is already in flight, so the UI never loses words.
    this.send({ type: 'transcript', text, isFinal: true });

    this.recordTranscript(text);
    this.transcriptSinceCoach.push(text);
    this.latestTranscript = this.buildRecentTranscriptWindow();
    void this.maybeCoach();
  }

  /**
   * Single-flight coaching: only one Claude+TTS round-trip runs at a time.
   * If newer speech arrived while we were busy, we re-run for the latest line
   * instead of silently dropping it.
   *
   * Streaming pipeline: we ask Claude to stream the coaching response and hand
   * each sentence-boundary chunk straight to the TTS queue as it arrives. This
   * means the first spoken word can leave the server long before Claude has
   * finished generating the full tip — the app starts hearing audio sooner. The
   * full text `coaching` message is still sent once at the end so the on-screen
   * transcript and the existing WebSocket message shape are unchanged.
   */
  private async maybeCoach(): Promise<void> {
    if (this.isCoaching) return;
    const transcript = this.latestTranscript;
    if (!transcript.trim()) return;
    const newWords = this.transcriptSinceCoach.join(' ').split(/\s+/).filter(Boolean).length;
    const now = Date.now();
    const msSinceAttempt = now - this.lastCoachAttemptAt;
    const msSinceTip = now - this.lastTipAt;
    if (msSinceAttempt < MIN_COACH_INTERVAL_MS) {
      return;
    }
    if (this.config.interactionMode !== 'roleplay' && newWords < MIN_NEW_WORDS_FOR_COACH && msSinceTip < MAX_COACH_SILENCE_MS) {
      return;
    }

    this.isCoaching = true;
    this.lastCoachAttemptAt = now;
    this.coachedTranscript = transcript;
    try {
      if (this.config.interactionMode === 'roleplay') {
        const turn = await this.generateRoleplayResponse(transcript);
        if (!turn) {
          throw new Error('Could not generate a roleplay response right now.');
        }
        this.transcriptSinceCoach = [];
        this.lastTipAt = Date.now();
        this.recordAssistant(turn.assistantReply);
        this.send({ type: 'coaching', text: turn.assistantReply });
        this.enqueueTts(turn.assistantReply);
        void this.maybeRollUpContext();
        return;
      }

      const onChunk = (chunk: string) => {
        // Pipe each streamed chunk to TTS immediately (fire-and-forget); the
        // queue preserves order and serializes playback.
        this.enqueueTts(chunk);
      };

      const coaching = await this.generateCoaching(transcript, onChunk);

      if (coaching && coaching !== 'HOLD') {
        this.transcriptSinceCoach = [];
        this.lastTipAt = Date.now();
        this.recordCoaching(coaching);
        // Send the full coaching text for the on-screen bubble. Audio for this
        // tip has already been streaming via enqueueTts as chunks arrived.
        this.send({ type: 'coaching', text: coaching });
        // Refresh the rolling summary if we've crossed the window threshold.
        // Done after sending so it never delays the live tip.
        void this.maybeRollUpContext();
      } else if (this.transcriptSinceCoach.length > RECENT_TRANSCRIPT_TURNS) {
        this.transcriptSinceCoach = this.transcriptSinceCoach.slice(-RECENT_TRANSCRIPT_TURNS);
      }
    } catch (err) {
      const msg = (err as Error).message ?? 'Coaching failed';
      console.error(`[Session ${this.id}] Coaching error:`, msg);
      this.send({ type: 'error', message: `Coaching error: ${msg}` });
    } finally {
      this.isCoaching = false;
      // New speech came in while we were coaching — coach on it now.
      if (this.latestTranscript !== this.coachedTranscript) {
        void this.maybeCoach();
      }
    }
  }

  private async generateRoleplayResponse(transcript: string) {
    return generateRoleplayTurn({
      mode: this.config.mode,
      scenario: this.config.roleplayScenario ?? this.config.mode,
      goal: this.config.roleplayGoal ?? '',
      context: this.config.roleplayContext ?? '',
      memory: this.config.roleplayMemory ?? {
        interests: [],
        personalDetails: [],
        callbackTopics: [],
      },
      transcript: this.history
        .slice(-RECENT_TRANSCRIPT_TURNS)
        .map((turn) => {
          const label = turn.role === 'user' ? 'Speaker' : 'Claude';
          return `${label}: ${turn.content.replace(/^Transcript:\s*/i, '').replace(/^"|"$/g, '')}`;
        })
        .join('\n'),
      userMessage: transcript,
      turnCount: this.history.length,
    });
  }

  private generateCoaching(
    transcript: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const c = this.config;
    const history = this.buildContext();
    switch (c.mode) {
      case 'dating':
        return generateDatingCoaching(
          transcript,
          c.datingName ?? '',
          c.datingProfileUrl ?? '',
          c.datingIntent ?? '',
          history,
          onChunk
        );
      case 'networking':
        return generateNetworkingCoaching(
          transcript,
          c.eventName ?? '',
          c.attendeeList ?? '',
          history,
          onChunk
        );
      case 'pitching':
        return generatePitchingCoaching(
          transcript,
          c.pitchTitle ?? '',
          c.pitchDeck ?? '',
          c.audienceType ?? '',
          history,
          onChunk
        );
      case 'hard_conversations':
        return generateHardConversationCoaching(
          transcript,
          c.scenario ?? 'confrontation',
          c.situation ?? '',
          c.conversationGoal ?? '',
          history,
          onChunk
        );
      default:
        return generateSalesCoaching(
          transcript,
          c.prospectContext ?? '',
          c.callGoal ?? '',
          c.objectionLibrary ?? '',
          history,
          onChunk
        );
    }
  }

  // --- Rolling context window --------------------------------------------------

  private recordTranscript(transcript: string): void {
    this.history.push({ role: 'user', content: `Transcript: "${transcript}"` });
  }

  private recordAssistant(text: string): void {
    this.history.push({ role: 'assistant', content: text });
  }

  private recordCoaching(coaching: string): void {
    this.history.push({ role: 'assistant', content: coaching });
  }

  private buildRecentTranscriptWindow(): string {
    if (this.config.interactionMode === 'roleplay') {
      return this.history
        .slice(-RECENT_TRANSCRIPT_TURNS)
        .map((turn) => {
          const label = turn.role === 'user' ? 'Speaker' : 'Claude';
          return `${label}: ${turn.content.replace(/^Transcript:\s*/i, '').replace(/^"|"$/g, '')}`;
        })
        .join('\n')
        .trim();
    }

    return this.history
      .filter((turn) => turn.role === 'user')
      .slice(-RECENT_TRANSCRIPT_TURNS)
      .map((turn) => turn.content.replace(/^Transcript:\s*/i, '').replace(/^"|"$/g, ''))
      .join(' ')
      .trim();
  }

  private mergeAdjacentTurns(turns: ConversationTurn[]): ConversationTurn[] {
    const merged: ConversationTurn[] = [];
    for (const turn of turns) {
      const previous = merged[merged.length - 1];
      if (previous && previous.role === turn.role) {
        previous.content = `${previous.content}\n${turn.content}`;
      } else {
        merged.push({ ...turn });
      }
    }
    return merged;
  }

  /**
   * Assemble the context handed to Claude: the rolling summary (if any) folded
   * in as a synthetic opening exchange, followed by the most recent turns kept
   * verbatim. Older turns already live inside `rollingSummary`.
   *
   * Backward-compatible: with a short conversation the summary is empty and we
   * simply return the recent turns, exactly like the old `history.slice(-8)`.
   */
  private buildContext(): ConversationTurn[] {
    const recent = this.history.slice(this.summarizedUpTo);
    if (!this.rollingSummary) return this.mergeAdjacentTurns(recent);

    const summaryTurn: ConversationTurn = {
      role: 'user',
      content: `Earlier conversation summary: ${this.rollingSummary}\n\nRecent conversation follows.`,
    };
    // A leading user turn needs an assistant reply for a valid alternating
    // sequence; a tiny acknowledgement keeps the shape correct.
    const ackTurn: ConversationTurn = {
      role: 'assistant',
      content: 'Understood. Continuing to coach with that context in mind.',
    };
    return this.mergeAdjacentTurns([summaryTurn, ackTurn, ...recent]);
  }

  /**
   * Decide whether the rolling window needs refreshing and, if so, summarize the
   * older turns. Triggered (a) once every RESUMMARIZE_EVERY turns once we exceed
   * KEEP_RECENT_TURNS, or (b) immediately if the estimated context size blows
   * past MAX_CONTEXT_TOKENS. Runs off the live path so it never delays a tip.
   */
  private async maybeRollUpContext(): Promise<void> {
    const totalTurns = this.history.length;
    if (totalTurns <= KEEP_RECENT_TURNS) return;

    const turnsSinceSummary = totalTurns - this.lastSummaryAtTurn;
    const overTokenBudget = this.estimateContextTokens() > MAX_CONTEXT_TOKENS;
    if (turnsSinceSummary < RESUMMARIZE_EVERY && !overTokenBudget) return;

    // Summarize everything except the most recent KEEP_RECENT_TURNS turns.
    const summarizeEnd = totalTurns - KEEP_RECENT_TURNS;
    if (summarizeEnd <= this.summarizedUpTo) return;

    const newlyOldTurns = this.history.slice(this.summarizedUpTo, summarizeEnd);
    const summary = await summarizeConversation(newlyOldTurns, this.rollingSummary);
    // summarizeConversation returns the prior summary on failure, so this is
    // safe even if the summary call errored — we just don't advance the cursor.
    if (summary && summary !== this.rollingSummary) {
      this.rollingSummary = summary;
      this.summarizedUpTo = summarizeEnd;
    }
    this.lastSummaryAtTurn = totalTurns;
  }

  private estimateContextTokens(): number {
    const recentChars = this.history
      .slice(this.summarizedUpTo)
      .reduce((sum, t) => sum + t.content.length, 0);
    const summaryChars = this.rollingSummary.length;
    return Math.ceil((recentChars + summaryChars) / CHARS_PER_TOKEN);
  }

  // --- TTS streaming pipeline --------------------------------------------------

  /**
   * Queue a text chunk for speech and kick the drain worker. Each chunk becomes
   * its own ElevenLabs request whose audio is sent as a `coaching_audio`
   * message — same message shape the app already consumes, just delivered as a
   * sequence of smaller clips instead of one large one. The app's playback
   * queue (useWingmanSession) already plays clips back to back in order.
   */
  private enqueueTts(text: string): void {
    if (!text.trim()) return;
    this.ttsQueue.push(text);
    void this.drainTts();
  }

  private async drainTts(): Promise<void> {
    if (this.ttsDraining) return;
    if (!process.env.ELEVENLABS_API_KEY) {
      this.ttsQueue = [];
      return;
    }
    this.ttsDraining = true;
    try {
      while (this.ttsQueue.length > 0) {
        const text = this.ttsQueue.shift()!;
        try {
          const audio = await textToSpeech(text);
          this.send({
            type: 'coaching_audio',
            audio: audio.toString('base64'),
            mimeType: 'audio/mpeg',
          });
        } catch (err) {
          console.error(`[Session ${this.id}] TTS error:`, (err as Error).message);
        }
      }
    } finally {
      this.ttsDraining = false;
      // A chunk may have been enqueued between the loop exit and clearing the
      // flag; pick it up rather than stranding it.
      if (this.ttsQueue.length > 0) void this.drainTts();
    }
  }

  private send(message: ServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  end(): void {
    this.transcriptionMode = 'chunked';
    this.ttsQueue = [];
    if (this.liveTranscriber) {
      this.liveTranscriber.finalize();
      void (async () => {
        await new Promise((resolve) => setTimeout(resolve, 650));
        await this.liveTranscriber?.close();
      })();
    }
  }
}
