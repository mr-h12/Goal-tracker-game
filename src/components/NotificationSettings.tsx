import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  getNotificationPermission,
  requestNotificationPermission,
  isReminderEnabled,
  scheduleDailyReminder,
  disableReminder,
  notifications,
} from '../lib/notifications';

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
    setReminderEnabled(isReminderEnabled());
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);
    const result = await requestNotificationPermission();
    setPermission(result);
    setLoading(false);

    if (result === 'granted') {
      // Send a test notification
      await notifications.dailyReminder();
    }
  };

  const handleToggleReminder = async () => {
    if (reminderEnabled) {
      disableReminder();
      setReminderEnabled(false);
    } else {
      if (permission !== 'granted') {
        const result = await requestNotificationPermission();
        setPermission(result);
        if (result !== 'granted') return;
      }
      await scheduleDailyReminder(20); // 8 PM
      setReminderEnabled(true);
    }
  };

  if (permission === 'unsupported') {
    return (
      <div className="rounded-xl border border-panel-border bg-panel p-4">
        <div className="text-sm text-neutral-500">
          Push notifications are not supported on this device.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-panel-border bg-panel p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-400">
        🔔 Notifications
      </h3>

      {permission === 'denied' ? (
        <div className="text-sm text-miss">
          Notifications are blocked. Please enable them in your browser settings.
        </div>
      ) : permission === 'default' ? (
        <motion.button
          className="w-full rounded-lg bg-neon/20 px-4 py-3 text-sm font-bold text-neon"
          onClick={handleEnableNotifications}
          disabled={loading}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? 'Enabling...' : '🔔 Enable Push Notifications'}
        </motion.button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Daily Reminder</div>
              <div className="text-xs text-neutral-500">Get reminded at 8 PM</div>
            </div>
            <button
              onClick={handleToggleReminder}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                reminderEnabled ? 'bg-neon' : 'bg-neutral-700'
              }`}
            >
              <motion.div
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                animate={{ left: reminderEnabled ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-done">
            <span>✓</span>
            <span>Notifications enabled</span>
          </div>
        </div>
      )}
    </div>
  );
}
