import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';

export type TranscriptHandler = (text: string, isFinal: boolean) => void;

export function createDeepgramStream(onTranscript: TranscriptHandler): LiveClient {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

  const connection = deepgram.listen.live({
    model: 'nova-3',
    language: 'en-US',
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 1000,
    vad_events: true,
    encoding: 'linear16',
    sample_rate: 16000,
    channels: 1,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log('[Deepgram] Connection opened');
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    if (transcript?.trim()) {
      onTranscript(transcript, data.is_final ?? false);
    }
  });

  connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
    // Utterance ended — useful for triggering coaching on natural pauses
  });

  connection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error('[Deepgram] Error:', err);
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log('[Deepgram] Connection closed');
  });

  return connection;
}
