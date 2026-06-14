import { scheduleFollowUpReminder } from '../hooks/useNotifications';

export type FollowUpItem = {
  timing: string;
  text: string;
};

function inferHours(timing: string, index = 0): number {
  const text = timing.toLowerCase();
  if (/\b(today|asap|now)\b/.test(text)) return 1 + index * 0.5;
  if (/\btomorrow\b/.test(text)) return 24 + index * 1;
  if (/\bnext week\b/.test(text)) return 7 * 24 + index * 4;
  if (/\bthis week\b/.test(text)) return 3 * 24 + index * 2;

  const hourMatch = text.match(/(\d+)\s*(hour|hours|hr|hrs|h)\b/);
  if (hourMatch) return Math.max(1, Number(hourMatch[1])) + index * 0.25;

  const dayMatch = text.match(/(\d+)\s*(day|days|d)\b/);
  if (dayMatch) return Math.max(1, Number(dayMatch[1])) * 24 + index * 0.5;

  const weekMatch = text.match(/(\d+)\s*(week|weeks|w)\b/);
  if (weekMatch) return Math.max(1, Number(weekMatch[1])) * 7 * 24 + index * 2;

  const monthMatch = text.match(/(\d+)\s*(month|months|mo|mos)\b/);
  if (monthMatch) return Math.max(1, Number(monthMatch[1])) * 30 * 24 + index * 12;

  return 24 + index * 1.5;
}

export async function scheduleFollowUps(
  followUps: FollowUpItem[] | undefined,
  input: { title: string; identifierPrefix: string }
): Promise<number> {
  if (!followUps?.length) return 0;

  let scheduled = 0;
  for (const [index, followUp] of followUps.entries()) {
    const ok = await scheduleFollowUpReminder({
      title: input.title,
      body: `${followUp.timing}: ${followUp.text}`,
      hours: inferHours(followUp.timing, index),
      identifier: `${input.identifierPrefix}-${index}`,
    });
    if (ok) scheduled += 1;
  }
  return scheduled;
}
