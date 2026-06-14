import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const DAILY_REMINDER_ID = 'wingman-daily-reminder';
const INACTIVE_NUDGE_ID = 'wingman-inactive-nudge';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  if (existing === 'undetermined') {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
  return false;
}

async function scheduleDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Ready for your next session?',
      body: 'Open Wingman before your next call, date, or pitch.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

async function scheduleInactivityNudge(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(INACTIVE_NUDGE_ID).catch(() => {});
  // Fire after 48 hours of inactivity
  await Notifications.scheduleNotificationAsync({
    identifier: INACTIVE_NUDGE_ID,
    content: {
      title: "Your wingman's been quiet",
      body: 'Two days without a session. Got a call or date coming up?',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 48 * 60 * 60,
      repeats: false,
    },
  });
}

export function useNotifications() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    requestPermission().then((granted) => {
      if (!granted) return;
      scheduleDailyReminder().catch(() => {});
      scheduleInactivityNudge().catch(() => {});
    });
  }, []);
}

// Call this after each completed session to reset the inactivity nudge timer.
export async function resetInactivityNudge(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await scheduleInactivityNudge();
  } catch { /* noop */ }
}

export async function scheduleFollowUpReminder(input: {
  title: string;
  body: string;
  hours?: number;
  identifier?: string;
}): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    const granted = await requestPermission();
    if (!granted) return false;

    if (input.identifier) {
      await Notifications.cancelScheduledNotificationAsync(input.identifier).catch(() => {});
    }

    await Notifications.scheduleNotificationAsync({
      identifier: input.identifier,
      content: {
        title: input.title,
        body: input.body,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(60, Math.round((input.hours ?? 24) * 60 * 60)),
        repeats: false,
      },
    });
    return true;
  } catch {
    return false;
  }
}
