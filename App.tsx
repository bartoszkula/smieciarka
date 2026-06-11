import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, SafeAreaView, Platform, ScrollView, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CalendarView } from './src/components/CalendarView';
import { ListView } from './src/components/ListView';
import { Legend } from './src/components/Legend';
import { ADDRESS } from './src/data/schedule';
import { theme } from './src/theme';
import {
  rescheduleAll, sendTestNotification, notificationsSupported, countScheduled,
} from './src/notifications';
import { exportICS } from './src/ics';

type Tab = 'kalendarz' | 'lista' | 'wiecej';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'kalendarz', label: 'Kalendarz', icon: '📅' },
  { id: 'lista', label: 'Lista', icon: '📋' },
  { id: 'wiecej', label: 'Więcej', icon: '⚙️' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('kalendarz');
  const [today] = useState(() => new Date());
  const [notifStatus, setNotifStatus] = useState<string>(
    notificationsSupported ? 'Planowanie powiadomień…' : 'Powiadomienia dostępne tylko w apce na telefonie.',
  );

  useEffect(() => {
    if (!notificationsSupported) return;
    let active = true;
    (async () => {
      const res = await rescheduleAll(new Date());
      if (!active) return;
      if (!res.granted) {
        setNotifStatus('Powiadomienia wyłączone — włącz je w ustawieniach systemu.');
      } else {
        setNotifStatus(`Zaplanowano ${res.scheduled} przypomnień (18:00 dzień przed wywozem).`);
      }
    })();
    return () => { active = false; };
  }, []);

  const onExport = useCallback(async () => {
    try {
      await exportICS();
    } catch (e) {
      const msg = 'Nie udało się wyeksportować kalendarza.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Błąd', msg);
    }
  }, []);

  const onTest = useCallback(async () => {
    const ok = await sendTestNotification();
    if (!ok) Alert.alert('Powiadomienia', 'Brak zgody na powiadomienia lub funkcja niedostępna na tej platformie.');
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>Śmieciarka jedzie!</Text>
        <Text style={styles.appAddr}>{ADDRESS}</Text>
      </View>

      <View style={styles.body}>
        {tab === 'kalendarz' && <CalendarView today={today} />}
        {tab === 'lista' && <ListView today={today} />}
        {tab === 'wiecej' && (
          <MoreScreen
            notifStatus={notifStatus}
            onExport={onExport}
            onTest={onTest}
          />
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
    </SafeAreaView>
  );
}

function MoreScreen({
  notifStatus, onExport, onTest,
}: {
  notifStatus: string;
  onExport: () => void;
  onTest: () => void;
}) {
  const [scheduled, setScheduled] = useState<number | null>(null);
  useEffect(() => {
    countScheduled().then(setScheduled).catch(() => setScheduled(null));
  }, [notifStatus]);

  return (
    <ScrollView contentContainerStyle={styles.more} showsVerticalScrollIndicator={false}>
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
      </View>

      <Text style={styles.sectionTitle}>Kalendarz systemowy</Text>
      <View style={styles.panel}>
        <Text style={styles.panelText}>
          Wyeksportuj wszystkie wywozy 2026 do pliku .ics (Kalendarz Google / systemowy). Każde wydarzenie ma
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

      <Text style={styles.footer}>Dane: harmonogram Pronatura / Czysta Bydgoszcz, okręg 5, 2026.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  appHeader: { paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? 14 : 8, paddingBottom: 8 },
  appTitle: { fontSize: 26, fontWeight: '800', color: theme.text },
  appAddr: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  body: { flex: 1 },
  tabbar: {
    flexDirection: 'row', backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border,
    paddingBottom: Platform.OS === 'ios' ? 18 : 8, paddingTop: 8,
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
  panelSub: { fontSize: 13, color: theme.textMuted },
  btn: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnOutline: { borderWidth: 1.5, borderColor: theme.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnOutlineTxt: { color: theme.primary, fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.7 },
  footer: { fontSize: 11.5, color: theme.textFaint, textAlign: 'center', marginTop: 24, lineHeight: 16 },
});
