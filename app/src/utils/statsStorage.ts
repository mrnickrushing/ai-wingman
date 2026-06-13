import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  sessions: 'wingman:sessions',
  bestScore: 'wingman:bestScore',
  streak: 'wingman:streak',
  lastSessionDate: 'wingman:lastSessionDate',
};

export interface PersistedStats {
  sessions: number;
  bestScore: number;
  streak: number;
  lastSessionDate: string | null; // ISO date string YYYY-MM-DD
}

export async function loadStats(): Promise<PersistedStats> {
  try {
    const [sessions, bestScore, streak, lastSessionDate] = await AsyncStorage.multiGet([
      KEYS.sessions, KEYS.bestScore, KEYS.streak, KEYS.lastSessionDate,
    ]);
    return {
      sessions: parseInt(sessions[1] ?? '0', 10) || 0,
      bestScore: parseInt(bestScore[1] ?? '0', 10) || 0,
      streak: parseInt(streak[1] ?? '0', 10) || 0,
      lastSessionDate: lastSessionDate[1] ?? null,
    };
  } catch {
    return { sessions: 0, bestScore: 0, streak: 0, lastSessionDate: null };
  }
}

export async function recordSessionStats(score: number): Promise<PersistedStats> {
  try {
    const current = await loadStats();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const newSessions = current.sessions + 1;
    const newBestScore = Math.max(current.bestScore, score);

    // Streak logic: if last session was yesterday → increment, if today → keep, otherwise reset to 1
    let newStreak = 1;
    if (current.lastSessionDate) {
      const last = new Date(current.lastSessionDate);
      const todayDate = new Date(today);
      const diffDays = Math.round((todayDate.getTime() - last.getTime()) / 86400000);
      if (diffDays === 0) newStreak = current.streak; // same day, don't increment
      else if (diffDays === 1) newStreak = current.streak + 1; // consecutive day
      else newStreak = 1; // streak broken
    }

    await AsyncStorage.multiSet([
      [KEYS.sessions, newSessions.toString()],
      [KEYS.bestScore, newBestScore.toString()],
      [KEYS.streak, newStreak.toString()],
      [KEYS.lastSessionDate, today],
    ]);

    return { sessions: newSessions, bestScore: newBestScore, streak: newStreak, lastSessionDate: today };
  } catch {
    return { sessions: 0, bestScore: 0, streak: 0, lastSessionDate: null };
  }
}
