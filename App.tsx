import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, SafeAreaView, Platform, ScrollView, Alert, Image,
  ActivityIndicator, StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Górny zapas: poniżej paska statusu / obiektywu aparatu na Androidzie.
const TOP_PAD = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) + 18 : 8;
// Dolny zapas: ponad paskiem nawigacji Androida (gesty/przyciski).
const BOTTOM_PAD = Platform.OS === 'android' ? 30 : Platform.OS === 'ios' ? 20 : 10;
import { CalendarView } from './src/components/CalendarView';
import { ListView } from './src/components/ListView';
import { Legend } from './src/components/Legend';
import { DownloadApkBanner, DownloadApkButton } from './src/components/DownloadApk';
import { AddressPicker } from './src/components/AddressPicker';
import { ScheduleProvider, useSchedule } from './src/data/ScheduleContext';
import { ScheduleData } from './src/data/schedule';
import { theme } from './src/theme';
import { WEB_MAX_WIDTH } from './src/config';
import {
  rescheduleAll, sendTestNotification, notificationsSupported, countScheduled,
} from './src/notifications';
import { exportICS } from './src/ics';
import { requestIgnoreBatteryOptimizations, batteryRequestSupported } from './src/battery';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGO = require('./assets/smieciarka.png');
const BATT_ASKED_KEY = 'battopt:asked:v1';

type Tab = 'kalendarz' | 'lista' | 'wiecej';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'kalendarz', label: 'Kalendarz', icon: '📅' },
  { id: 'lista', label: 'Lista', icon: '📋' },
  { id: 'wiecej', label: 'Więcej', icon: '⚙️' },
];

export default function App() {
  return (
    <ScheduleProvider>
      <AppInner />
    </ScheduleProvider>
  );
}

function AppInner() {
  const { schedule, status, error, outdated } = useSchedule();
  const [tab, setTab] = useState<Tab>('kalendarz');
  const [today] = useState(() => new Date());
  const [notifStatus, setNotifStatus] = useState<string>(
    notificationsSupported ? 'Planowanie powiadomień…' : 'Powiadomienia dostępne tylko w apce na telefonie.',
  );

  // Przeplanuj powiadomienia za każdym razem, gdy zmieni się harmonogram (np. po odświeżeniu na nowy rok).
  useEffect(() => {
    if (!notificationsSupported) return;
    let active = true;
    (async () => {
      const res = await rescheduleAll(new Date(), schedule.days);
      if (!active) return;
      if (!res.granted) {
        setNotifStatus('Powiadomienia wyłączone — włącz je w ustawieniach systemu.');
        return;
      }
      setNotifStatus(`Zaplanowano ${res.scheduled} przypomnień (18:00 dzień przed wywozem).`);

      // Jednorazowy monit o wyłączenie optymalizacji baterii (pewność powiadomień).
      if (batteryRequestSupported) {
        const asked = await AsyncStorage.getItem(BATT_ASKED_KEY);
        if (!asked && active) {
          await AsyncStorage.setItem(BATT_ASKED_KEY, '1');
          Alert.alert(
            'Pewność powiadomień',
            'Aby przypomnienia o wywozie na pewno przychodziły o 18:00 (nawet przy zamkniętej apce), pozwól aplikacji działać bez ograniczeń baterii. Otworzyć systemowe ustawienie?',
            [
              { text: 'Później', style: 'cancel' },
              { text: 'Otwórz', onPress: () => { requestIgnoreBatteryOptimizations(); } },
            ],
          );
        }
      }
    })();
    return () => { active = false; };
  }, [schedule]);

  const onExport = useCallback(async () => {
    try {
      await exportICS(schedule);
    } catch {
      const msg = 'Nie udało się wyeksportować kalendarza.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Błąd', msg);
    }
  }, [schedule]);

  const onTest = useCallback(async () => {
    const ok = await sendTestNotification(schedule.days);
    if (!ok) Alert.alert('Powiadomienia', 'Brak zgody na powiadomienia lub funkcja niedostępna na tej platformie.');
  }, [schedule]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.column}>
        <View style={styles.appHeader}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.appTitle}>Śmieciarka jedzie!</Text>
            <Text style={styles.appAddr}>{schedule.address}</Text>
          </View>
        </View>

        {/* Banner błędu odświeżenia harmonogramu na nowy rok */}
        {status === 'error' && outdated && error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorTxt}>⚠️ {error}</Text>
          </View>
        )}

        <DownloadApkBanner />

        <View style={styles.body}>
          {tab === 'kalendarz' && <CalendarView schedule={schedule} today={today} />}
          {tab === 'lista' && <ListView schedule={schedule} today={today} />}
          {tab === 'wiecej' && (
            <MoreScreen schedule={schedule} notifStatus={notifStatus} onExport={onExport} onTest={onTest} />
          )}
        </View>

        <View style={styles.tabbar}>
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <Pressable key={t.id} style={styles.tab} onPress={() => setTab(t.id)}>
                <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{t.icon}</Text>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function MoreScreen({
  schedule, notifStatus, onExport, onTest,
}: {
  schedule: ScheduleData;
  notifStatus: string;
  onExport: () => void;
  onTest: () => void;
}) {
  const { status, error, refresh, changeAddress, address } = useSchedule();
  const [scheduled, setScheduled] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    countScheduled().then(setScheduled).catch(() => setScheduled(null));
  }, [notifStatus]);

  return (
    <>
    <ScrollView contentContainerStyle={styles.more} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Adres</Text>
      <View style={styles.panel}>
        <Text style={styles.panelText}>{schedule.address}</Text>
        <Text style={styles.panelSub}>
          Operator: <Text style={styles.bold}>{schedule.operator}</Text>. Obsługiwani: ProNatura, Remondis, Corimp (Bydgoszcz).
          Domyślnie {address.street} {address.number}.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={() => setPickerOpen(true)}
        >
          <Text style={styles.btnTxt}>Zmień adres</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Harmonogram</Text>
      <View style={styles.panel}>
        <Text style={styles.panelText}>Rok: <Text style={styles.bold}>{schedule.year}</Text></Text>
        <Text style={styles.panelSub}>
          Po Nowym Roku aplikacja sama pobierze nowy harmonogram z serwisu miejskiego dla tego adresu.
          Jeśli się nie uda — zobaczysz błąd u góry.
        </Text>
        {status === 'error' && error && <Text style={styles.errInline}>⚠️ {error}</Text>}
        <Pressable
          style={({ pressed }) => [styles.btnOutline, pressed && styles.pressed]}
          onPress={refresh}
          disabled={status === 'refreshing'}
        >
          {status === 'refreshing'
            ? <ActivityIndicator color={theme.primary} />
            : <Text style={styles.btnOutlineTxt}>Sprawdź aktualizację harmonogramu</Text>}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Powiadomienia</Text>
      <View style={styles.panel}>
        <Text style={styles.panelText}>{notifStatus}</Text>
        {scheduled != null && notificationsSupported && (
          <Text style={styles.panelSub}>Aktywnych przypomnień w systemie: {scheduled}</Text>
        )}
        {notificationsSupported && (
          <Pressable style={({ pressed }) => [styles.btnOutline, pressed && styles.pressed]} onPress={onTest}>
            <Text style={styles.btnOutlineTxt}>Wyślij powiadomienie testowe</Text>
          </Pressable>
        )}
        {batteryRequestSupported && (
          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.pressed]}
            onPress={() => requestIgnoreBatteryOptimizations()}
          >
            <Text style={styles.btnOutlineTxt}>Wyłącz oszczędzanie baterii dla apki</Text>
          </Pressable>
        )}
      </View>

      <DownloadApkButton />

      <Text style={styles.sectionTitle}>Kalendarz systemowy</Text>
      <View style={styles.panel}>
        <Text style={styles.panelText}>
          Wyeksportuj wszystkie wywozy do pliku .ics (Kalendarz Google / systemowy). Każde wydarzenie ma
          przypomnienie o 18:00 dnia poprzedniego.
        </Text>
        <Pressable style={({ pressed }) => [styles.btn, pressed && styles.pressed]} onPress={onExport}>
          <Text style={styles.btnTxt}>Eksportuj do kalendarza (.ics)</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Legenda frakcji</Text>
      <View style={styles.panel}>
        <Legend />
      </View>

      <Text style={styles.footer}>Dane: serwis miejski Pronatura / Czysta Bydgoszcz.</Text>
    </ScrollView>
    <AddressPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} changeAddress={changeAddress} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: WEB_MAX_WIDTH },
  appHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: TOP_PAD, paddingBottom: 8,
  },
  logo: { width: 44, height: 44, borderRadius: 10 },
  appTitle: { fontSize: 24, fontWeight: '800', color: theme.text },
  appAddr: { fontSize: 12.5, color: theme.textMuted, marginTop: 2 },
  errorBanner: { backgroundColor: '#FDECEA', borderColor: '#F5C6CB', borderWidth: 1, marginHorizontal: 14, padding: 12, borderRadius: 12 },
  errorTxt: { color: '#B71C1C', fontSize: 13, lineHeight: 18 },
  body: { flex: 1 },
  tabbar: {
    flexDirection: 'row', backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border,
    paddingBottom: BOTTOM_PAD, paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 20, opacity: 0.45 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 11, color: theme.textMuted },
  tabLabelActive: { color: theme.primary, fontWeight: '700' },
  more: { padding: 16, paddingBottom: 30 },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, color: theme.textMuted, marginTop: 18, marginBottom: 8 },
  panel: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16, gap: 12,
    shadowColor: theme.shadow, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  panelText: { fontSize: 14, color: theme.text, lineHeight: 20 },
  panelSub: { fontSize: 13, color: theme.textMuted, lineHeight: 18 },
  bold: { fontWeight: '800' },
  errInline: { fontSize: 13, color: '#B71C1C', lineHeight: 18 },
  btn: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnOutline: { borderWidth: 1.5, borderColor: theme.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', minHeight: 46, justifyContent: 'center' },
  btnOutlineTxt: { color: theme.primary, fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.7 },
  footer: { fontSize: 11.5, color: theme.textFaint, textAlign: 'center', marginTop: 24, lineHeight: 16 },
});
