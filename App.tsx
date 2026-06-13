import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { LanguagePicker } from './src/components/LanguagePicker';
import { CoverageMap } from './src/components/CoverageMap';
import { ScheduleProvider, useSchedule } from './src/data/ScheduleContext';
import { ScheduleData } from './src/data/schedule';
import { PrefsProvider, usePrefs } from './src/prefs';
import { flagFor } from './src/i18n';
import { Theme, ThemeMode } from './src/theme';
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

const TABS: { id: Tab; labelKey: string; icon: string }[] = [
  { id: 'kalendarz', labelKey: 'tab.calendar', icon: '📅' },
  { id: 'lista', labelKey: 'tab.list', icon: '📋' },
  { id: 'wiecej', labelKey: 'tab.settings', icon: '⚙️' },
];

// Status powiadomień jako klucz tłumaczenia + parametry (lokalizowany przy renderze).
interface NotifStatus { key: string; params?: Record<string, string | number> }

export default function App() {
  return (
    <PrefsProvider>
      <ScheduleProvider>
        <AppInner />
      </ScheduleProvider>
    </PrefsProvider>
  );
}

function AppInner() {
  const { schedule, status, error, outdated } = useSchedule();
  const { palette, themeMode, lang, t, toggleTheme } = usePrefs();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [tab, setTab] = useState<Tab>('kalendarz');
  const [today] = useState(() => new Date());
  const [langOpen, setLangOpen] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotifStatus>(
    { key: notificationsSupported ? 'notif.scheduling' : 'notif.webOnly' },
  );

  // Przeplanuj powiadomienia za każdym razem, gdy zmieni się harmonogram (np. po odświeżeniu na nowy rok).
  useEffect(() => {
    if (!notificationsSupported) return;
    let active = true;
    (async () => {
      const res = await rescheduleAll(new Date(), schedule.days, lang);
      if (!active) return;
      if (!res.granted) {
        setNotifStatus({ key: 'notif.disabled' });
        return;
      }
      setNotifStatus({ key: 'notif.scheduled', params: { n: res.scheduled } });

      // Jednorazowy monit o wyłączenie optymalizacji baterii (pewność powiadomień).
      if (batteryRequestSupported) {
        const asked = await AsyncStorage.getItem(BATT_ASKED_KEY);
        if (!asked && active) {
          await AsyncStorage.setItem(BATT_ASKED_KEY, '1');
          Alert.alert(
            t('battery.title'),
            t('battery.body'),
            [
              { text: t('battery.later'), style: 'cancel' },
              { text: t('battery.open'), onPress: () => { requestIgnoreBatteryOptimizations(); } },
            ],
          );
        }
      }
    })();
    return () => { active = false; };
  }, [schedule, t, lang]);

  const onExport = useCallback(async () => {
    try {
      await exportICS(schedule);
    } catch {
      const msg = t('export.fail');
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert(t('common.error'), msg);
    }
  }, [schedule, t]);

  const onTest = useCallback(async () => {
    const ok = await sendTestNotification(schedule.days, lang);
    if (!ok) Alert.alert(t('notif.testFailTitle'), t('notif.testFailBody'));
  }, [schedule, t, lang]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.column}>
        <View style={styles.appHeader}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.appTitle}>Śmieciarka jedzie!</Text>
            <Text style={styles.appAddr}>{schedule.address}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={toggleTheme}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              hitSlop={8}
            >
              <Text style={styles.iconTxt}>{themeMode === 'dark' ? '☀️' : '🌙'}</Text>
            </Pressable>
            <Pressable
              onPress={() => setLangOpen(true)}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              hitSlop={8}
            >
              <Text style={styles.flagTxt}>{flagFor(lang)}</Text>
            </Pressable>
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
          {TABS.map((tb) => {
            const active = tb.id === tab;
            return (
              <Pressable key={tb.id} style={styles.tab} onPress={() => setTab(tb.id)}>
                <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{tb.icon}</Text>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t(tb.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />
    </SafeAreaView>
  );
}

function MoreScreen({
  schedule, notifStatus, onExport, onTest,
}: {
  schedule: ScheduleData;
  notifStatus: NotifStatus;
  onExport: () => void;
  onTest: () => void;
}) {
  const { status, error, refresh, changeAddress, address } = useSchedule();
  const { palette, themeMode, lang, t, setThemeMode } = usePrefs();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [scheduled, setScheduled] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  useEffect(() => {
    countScheduled().then(setScheduled).catch(() => setScheduled(null));
  }, [notifStatus]);

  return (
    <>
    <ScrollView contentContainerStyle={styles.more} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>{t('more.language')}</Text>
      <View style={styles.panel}>
        <Pressable
          style={({ pressed }) => [styles.langRow, pressed && styles.pressed]}
          onPress={() => setLangOpen(true)}
        >
          <Text style={styles.langFlag}>{flagFor(lang)}</Text>
          <Text style={styles.panelText}>{t('more.language')}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{t('more.theme')}</Text>
      <View style={styles.panel}>
        <View style={styles.segment}>
          {(['light', 'dark'] as ThemeMode[]).map((m) => {
            const on = themeMode === m;
            return (
              <Pressable
                key={m}
                style={[styles.segBtn, on && styles.segBtnOn]}
                onPress={() => setThemeMode(m)}
              >
                <Text style={[styles.segTxt, on && styles.segTxtOn]}>
                  {m === 'light' ? `☀️ ${t('more.themeLight')}` : `🌙 ${t('more.themeDark')}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('more.address')}</Text>
      <View style={styles.panel}>
        <Text style={styles.panelText}>{schedule.address}</Text>
        <Text style={styles.panelSub}>
          {t('more.operatorLine', { op: schedule.operator, street: address.street, number: address.number })}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={() => setPickerOpen(true)}
        >
          <Text style={styles.btnTxt}>{t('more.changeAddress')}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{t('more.coverage')}</Text>
      <View style={styles.panel}>
        <CoverageMap />
      </View>

      <Text style={styles.sectionTitle}>{t('more.schedule')}</Text>
      <View style={styles.panel}>
        <Text style={styles.panelText}>{t('more.year', { year: schedule.year })}</Text>
        <Text style={styles.panelSub}>{t('more.scheduleNote')}</Text>
        {status === 'error' && error && <Text style={styles.errInline}>⚠️ {error}</Text>}
        <Pressable
          style={({ pressed }) => [styles.btnOutline, pressed && styles.pressed]}
          onPress={refresh}
          disabled={status === 'refreshing'}
        >
          {status === 'refreshing'
            ? <ActivityIndicator color={palette.primary} />
            : <Text style={styles.btnOutlineTxt}>{t('more.checkUpdate')}</Text>}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{t('more.notifications')}</Text>
      <View style={styles.panel}>
        <Text style={styles.panelText}>{t(notifStatus.key, notifStatus.params)}</Text>
        {scheduled != null && notificationsSupported && (
          <Text style={styles.panelSub}>{t('more.activeReminders', { n: scheduled })}</Text>
        )}
        {notificationsSupported && (
          <Pressable style={({ pressed }) => [styles.btnOutline, pressed && styles.pressed]} onPress={onTest}>
            <Text style={styles.btnOutlineTxt}>{t('more.notifTest')}</Text>
          </Pressable>
        )}
        {batteryRequestSupported && (
          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.pressed]}
            onPress={() => requestIgnoreBatteryOptimizations()}
          >
            <Text style={styles.btnOutlineTxt}>{t('more.batteryBtn')}</Text>
          </Pressable>
        )}
      </View>

      <DownloadApkButton />

      <Text style={styles.sectionTitle}>{t('more.systemCalendar')}</Text>
      <View style={styles.panel}>
        <Text style={styles.panelText}>{t('more.exportNote')}</Text>
        <Pressable style={({ pressed }) => [styles.btn, pressed && styles.pressed]} onPress={onExport}>
          <Text style={styles.btnTxt}>{t('more.exportBtn')}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{t('more.legend')}</Text>
      <View style={styles.panel}>
        <Legend />
      </View>

      <Text style={styles.footer}>{t('more.footer')}</Text>
    </ScrollView>
    <AddressPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} changeAddress={changeAddress} />
    <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />
    </>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: WEB_MAX_WIDTH },
  appHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: TOP_PAD, paddingBottom: 8,
  },
  logo: { width: 44, height: 44, borderRadius: 10 },
  appTitle: { fontSize: 24, fontWeight: '800', color: c.text },
  appAddr: { fontSize: 12.5, color: c.textMuted, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.card,
  },
  iconTxt: { fontSize: 18 },
  flagTxt: { fontSize: 22 },
  errorBanner: { backgroundColor: '#FDECEA', borderColor: '#F5C6CB', borderWidth: 1, marginHorizontal: 14, padding: 12, borderRadius: 12 },
  errorTxt: { color: '#B71C1C', fontSize: 13, lineHeight: 18 },
  body: { flex: 1 },
  tabbar: {
    flexDirection: 'row', backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border,
    paddingBottom: BOTTOM_PAD, paddingTop: 10,
  },
  // 10px paddingu nad elementami menu.
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingTop: 10 },
  tabIcon: { fontSize: 20, opacity: 0.45 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 11, color: c.textMuted },
  tabLabelActive: { color: c.primary, fontWeight: '700' },
  more: { padding: 16, paddingBottom: 30 },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, color: c.textMuted, marginTop: 18, marginBottom: 8 },
  panel: {
    backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 12,
    shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  panelText: { fontSize: 14, color: c.text, lineHeight: 20 },
  panelSub: { fontSize: 13, color: c.textMuted, lineHeight: 18 },
  errInline: { fontSize: 13, color: '#B71C1C', lineHeight: 18 },
  btn: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnOutline: { borderWidth: 1.5, borderColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', minHeight: 46, justifyContent: 'center' },
  btnOutlineTxt: { color: c.primary, fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.7 },
  footer: { fontSize: 11.5, color: c.textFaint, textAlign: 'center', marginTop: 24, lineHeight: 16 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langFlag: { fontSize: 26 },
  chevron: { marginLeft: 'auto', fontSize: 22, color: c.textFaint, fontWeight: '700' },
  segment: { flexDirection: 'row', backgroundColor: c.bg, borderRadius: 12, padding: 4, gap: 4 },
  segBtn: { flex: 1, paddingVertical: 11, borderRadius: 9, alignItems: 'center' },
  segBtnOn: { backgroundColor: c.primary },
  segTxt: { fontSize: 14, fontWeight: '700', color: c.textMuted },
  segTxtOn: { color: '#fff' },
});
