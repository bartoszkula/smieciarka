import React, { useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { usePrefs } from '../prefs';
import { LANGUAGES } from '../i18n';
import { Theme } from '../theme';

export function LanguagePicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { palette, lang, setLang, t } = usePrefs();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handleBar} />
          <Text style={styles.title}>{t('lang.title')}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {LANGUAGES.map((l) => {
              const active = l.code === lang;
              return (
                <Pressable
                  key={l.code}
                  style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.pressed]}
                  onPress={() => { setLang(l.code); onClose(); }}
                >
                  <Text style={styles.flag}>{l.flag}</Text>
                  <Text style={[styles.name, active && styles.nameActive]}>{l.name}</Text>
                  {active && <Text style={styles.check}>✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    maxHeight: '80%', alignSelf: 'center', width: '100%', maxWidth: 460,
  },
  handleBar: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, marginBottom: 2,
  },
  rowActive: { backgroundColor: c.card },
  pressed: { opacity: 0.6 },
  flag: { fontSize: 26 },
  name: { fontSize: 16, color: c.text, flex: 1 },
  nameActive: { fontWeight: '800' },
  check: { fontSize: 18, color: c.primary, fontWeight: '800' },
});
