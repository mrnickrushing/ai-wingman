import axios from 'axios';

const API_URL = 'https://api.elevenlabs.io/v1';

export async function textToSpeech(text: string): Promise<Buffer> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';

  const response = await axios.post(
    `${API_URL}/text-to-speech/${voiceId}`,
    {
      text,
      model_id: 'eleven_turbo_v2',
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: false,
      },
    },
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      responseType: 'arraybuffer',
      timeout: 5000,
    }
  );

  return Buffer.from(response.data);
}
