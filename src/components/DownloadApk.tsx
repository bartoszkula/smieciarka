import React from 'react';
import { Platform, Pressable, Text, StyleSheet, Linking, View } from 'react-native';
import { APK_URL } from '../config';
import { theme } from '../theme';

/** Czy jesteśmy w przeglądarce na Androidzie (widok mobilny web). */
export function isAndroidWeb(): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    return /Android/i.test(navigator.userAgent || '');
  } catch {
    return false;
  }
}

function openApk() {
  Linking.openURL(APK_URL).catch(() => {});
}

/** Pasek zachęcający do pobrania APK — pokazywany TYLKO w mobilnym widoku web (Android). */
export function DownloadApkBanner() {
  if (!isAndroidWeb()) return null;
  return (
    <Pressable style={({ pressed }) => [styles.banner, pressed && styles.pressed]} onPress={openApk}>
      <Text style={styles.icon}>📲</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Pobierz aplikację na Androida</Text>
        <Text style={styles.sub}>Powiadomienia push działają tylko w aplikacji.</Text>
      </View>
      <Text style={styles.cta}>Pobierz</Text>
    </Pressable>
  );
}

/** Wariant przycisku do ekranu „Więcej" (też tylko mobilny web). */
export function DownloadApkButton() {
  if (!isAndroidWeb()) return null;
  return (
    <Pressable style={({ pressed }) => [styles.btn, pressed && styles.pressed]} onPress={openApk}>
      <Text style={styles.btnTxt}>📲 Pobierz aplikację na Androida (.apk)</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1B5E20', marginHorizontal: 14, marginTop: 4, marginBottom: 6,
    paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12,
  },
  icon: { fontSize: 22 },
  title: { color: '#fff', fontWeight: '800', fontSize: 14 },
  sub: { color: '#C8E6C9', fontSize: 11.5, marginTop: 1 },
  cta: { color: '#fff', fontWeight: '800', fontSize: 14, textDecorationLine: 'underline' },
  btn: { backgroundColor: '#1B5E20', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pressed: { opacity: 0.8 },
});
