import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {
  PICKUP_DAYS, WASTE_TYPES, WasteTypeId, PickupDay,
} from './data/schedule';
import { MONTHS_PL_GEN } from './utils/format';

// Godzina powiadomienia: 18:00 dnia POPRZEDZAJĄCEGO wywóz.
const NOTIFY_HOUR = 18;
const NOTIFY_MINUTE = 0;
const ANDROID_CHANNEL = 'wywoz-smieci';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationsSupported = Platform.OS !== 'web';

function typesText(types: WasteTypeId[]): string {
  return types.map((t) => WASTE_TYPES[t].label).join(', ');
}

function body(day: PickupDay): string {
  const base = `Jutro odbierają: ${typesText(day.types)}. Wystaw pojemniki przed dom do 6:00 rano.`;
  if (day.types.includes('gabaryty')) {
    return `${base} Gabaryty można wystawić już dziś od 19:00.`;
  }
  return base;
}

async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Wywóz śmieci',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2E7D32',
    });
  }
}

/** Prosi o zgodę na powiadomienia. Zwraca true jeśli przyznano. */
export async function requestPermissions(): Promise<boolean> {
  if (!notificationsSupported) return false;
  if (!Device.isDevice) {
    // Emulatory zwykle też wspierają lokalne powiadomienia, ale ostrzegamy.
    console.warn('Powiadomienia działają najlepiej na fizycznym urządzeniu.');
  }
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  return status === 'granted';
}

export interface ScheduleResult {
  scheduled: number;
  granted: boolean;
}

/**
 * Kasuje wcześniejsze i planuje powiadomienia dla wszystkich przyszłych
 * dni wywozu (jedno powiadomienie na dzień, o 18:00 dnia poprzedniego).
 */
export async function rescheduleAll(now: Date): Promise<ScheduleResult> {
  if (!notificationsSupported) return { scheduled: 0, granted: false };
  const granted = await requestPermissions();
  if (!granted) return { scheduled: 0, granted: false };

  await Notifications.cancelAllScheduledNotificationsAsync();

  let scheduled = 0;
  for (const day of PICKUP_DAYS) {
    const trigger = new Date(day.dateObj);
    trigger.setDate(trigger.getDate() - 1);
    trigger.setHours(NOTIFY_HOUR, NOTIFY_MINUTE, 0, 0);
    if (trigger.getTime() <= now.getTime()) continue; // tylko przyszłe

    const d = day.dateObj;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🗑️ Jutro wywóz śmieci',
        body: body(day),
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
        data: { date: day.date },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
      },
    });
    scheduled++;
  }
  return { scheduled, granted };
}

/** Powiadomienie testowe — pojawi się za kilka sekund. */
export async function sendTestNotification(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const granted = await requestPermissions();
  if (!granted) return false;
  const sample = PICKUP_DAYS[0];
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🗑️ Test powiadomienia',
      body: sample
        ? `Tak będzie wyglądać przypomnienie. Np. ${sample.dateObj.getDate()} ${MONTHS_PL_GEN[sample.dateObj.getMonth()]}: ${typesText(sample.types)}.`
        : 'Powiadomienia działają!',
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 4,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
    },
  });
  return true;
}

export async function countScheduled(): Promise<number> {
  if (!notificationsSupported) return 0;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.length;
}
