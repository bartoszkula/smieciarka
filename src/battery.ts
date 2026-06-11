import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';

export const batteryRequestSupported = Platform.OS === 'android';

const PKG_FALLBACK = 'pl.bydgoszcz.wywozsmieci';

/**
 * Pokazuje systemowe okno z prośbą o wyłączenie optymalizacji baterii dla apki
 * (żeby Android mógł obudzić ją o 18:00 i pokazać powiadomienie).
 * Gdy bezpośredni monit zawiedzie — otwiera ustawienia aplikacji.
 */
export async function requestIgnoreBatteryOptimizations(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const pkg = Application.applicationId ?? PKG_FALLBACK;
  try {
    await IntentLauncher.startActivityAsync(
      'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      { data: `package:${pkg}` },
    );
  } catch {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
        { data: `package:${pkg}` },
      );
    } catch {
      /* nic więcej nie zrobimy */
    }
  }
}
