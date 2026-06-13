function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export interface ScoreInput {
  coachingTipsTaken: number;
  elapsedSeconds: number;
  wordsSelf: number;
  rating: number;
}

export function computeWingmanScore({
  coachingTipsTaken,
  elapsedSeconds,
  wordsSelf,
  rating,
}: ScoreInput): number {
  const wpm = elapsedSeconds > 0 ? wordsSelf / (elapsedSeconds / 60) : 0;

  const raw =
    coachingTipsTaken * 18 +
    (clamp(wpm, 80, 140) / 140) * 25 +
    (clamp(elapsedSeconds, 60, 600) / 600) * 25 +
    (rating > 0 ? rating * 3 : 0);

  return clamp(Math.round(raw), 0, 100);
}

export interface ScoreTheme {
  color: string;
  label: string;
}

export function scoreTheme(score: number): ScoreTheme {
  if (score >= 90) return { color: '#6366f1', label: 'Elite performance' };
  if (score >= 75) return { color: '#4ade80', label: 'Strong session' };
  if (score >= 50) return { color: '#f59e0b', label: 'Getting there' };
  return { color: '#f43f5e', label: 'Keep practicing' };
}
