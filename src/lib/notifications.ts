// Push notification utilities for Quest Duo PWA

export type NotificationType = 'reminder' | 'levelup' | 'achievement' | 'dailywinner';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
}


// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const permission = await Notification.requestPermission();
  return permission;
}

// Send a notification
export async function sendNotification(
  type: NotificationType,
  payload: NotificationPayload,
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag ?? type,
      data: { type, ...payload.data },
      requireInteraction: type === 'reminder',
    } as NotificationOptions);

    return true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

// Predefined notification templates
export const notifications = {
  dailyReminder: () =>
    sendNotification('reminder', {
      title: '📜 Quest Duo',
      body: "Don't forget to complete your quests today!",
      tag: 'daily-reminder',
    }),

  levelUp: (username: string, level: number, title: string) =>
    sendNotification('levelup', {
      title: '⬆️ LEVEL UP!',
      body: `${username} reached Level ${level} - ${title}!`,
      tag: `levelup-${level}`,
    }),

  achievement: (username: string, achievementName: string) =>
    sendNotification('achievement', {
      title: '🏅 Achievement Unlocked!',
      body: `${username} earned "${achievementName}"`,
      tag: `achievement-${achievementName}`,
    }),

  dailyWinner: (username: string, xp: number) =>
    sendNotification('dailywinner', {
      title: '🏆 Daily Champion!',
      body: `${username} won yesterday with ${xp} XP! +50 bonus XP awarded.`,
      tag: 'daily-winner',
    }),

  evolution: (username: string, newEmoji: string) =>
    sendNotification('levelup', {
      title: '✨ EVOLUTION!',
      body: `${username}'s avatar evolved to ${newEmoji}!`,
      tag: 'evolution',
    }),
};

// Schedule a daily reminder notification (requires background sync support)
export async function scheduleDailyReminder(hour: number = 20): Promise<boolean> {
  if (!('periodicSync' in navigator.serviceWorker)) {
    // Fallback: use localStorage to track reminder preference
    localStorage.setItem('quest-duo:reminder-hour', String(hour));
    return true;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // @ts-expect-error - periodicSync is not in TypeScript types yet
    await registration.periodicSync.register('daily-reminder', {
      minInterval: 24 * 60 * 60 * 1000, // 24 hours
    });
    return true;
  } catch {
    // Periodic sync not available, fall back to localStorage preference
    localStorage.setItem('quest-duo:reminder-hour', String(hour));
    return false;
  }
}

// Check if reminders are enabled
export function isReminderEnabled(): boolean {
  return localStorage.getItem('quest-duo:reminder-hour') !== null;
}

// Disable reminders
export function disableReminder(): void {
  localStorage.removeItem('quest-duo:reminder-hour');
}
