import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { searchStreets } from '../data/source';
import { usePrefs } from '../prefs';
import { Theme } from '../theme';

export function AddressPicker({
  visible, onClose, changeAddress,
}: {
  visible: boolean;
  onClose: () => void;
  changeAddress: (street: string, number: string) => Promise<boolean>;
}) {
  const { palette, t } = usePrefs();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [streetInput, setStreetInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [numberInput, setNumberInput] = useState('');
  const [loadingStreets, setLoadingStreets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStreetInput(''); setSuggestions([]); setNumberInput(''); setErr(null);
  }, []);

  const onStreetChange = useCallback(async (text: string) => {
    setStreetInput(text);
    setErr(null);
    if (text.trim().length < 2) { setSuggestions([]); return; }
    setLoadingStreets(true);
    try {
      setSuggestions(await searchStreets(text));
    } catch {
      setErr(t('addr.streetsFail'));
    } finally {
      setLoadingStreets(false);
    }
  }, [t]);

  const submit = useCallback(async () => {
    const street = streetInput.trim();
    const number = numberInput.trim();
    if (!street || !number) { setErr(t('addr.provideBoth')); return; }
    setSaving(true);
    setErr(null);
    const ok = await changeAddress(street, number);
    setSaving(false);
    if (ok) { reset(); onClose(); }
    else setErr(t('addr.notFound', { street, number }));
  }, [streetInput, numberInput, changeAddress, reset, onClose, t]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <View style={styles.handleBar} />
          <Text style={styles.title}>{t('addr.title')}</Text>
          <Text style={styles.hint}>{t('addr.hint')}</Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>{t('addr.street')}</Text>
            <TextInput
              style={styles.input}
              value={streetInput}
              onChangeText={onStreetChange}
              placeholder={t('addr.streetPh')}
              autoCapitalize="characters"
              placeholderTextColor={palette.textFaint}
            />
            {loadingStreets && <ActivityIndicator style={{ marginTop: 6 }} color={palette.primary} />}
            {suggestions.length > 0 && (
              <View style={styles.suggestBox}>
                {suggestions.map((name) => (
                  <Pressable
                    key={name}
                    style={({ pressed }) => [styles.suggest, pressed && styles.pressed]}
                    onPress={() => { setStreetInput(name); setSuggestions([]); }}
                  >
                    <Text style={styles.suggestTxt}>{name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>{t('addr.number')}</Text>
            <TextInput
              style={styles.input}
              value={numberInput}
              onChangeText={(tx) => { setNumberInput(tx); setErr(null); }}
              placeholder={t('addr.numberPh')}
              placeholderTextColor={palette.textFaint}
            />

            {err && <Text style={styles.err}>⚠️ {err}</Text>}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.btnGhostTxt}>{t('addr.cancel')}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.btn, pressed && styles.pressed]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>{t('addr.submit')}</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    maxHeight: '85%', alignSelf: 'center', width: '100%', maxWidth: 460,
  },
  handleBar: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '800', color: c.text },
  hint: { fontSize: 13, color: c.textMuted, marginTop: 2, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: c.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: c.text,
  },
  suggestBox: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, marginTop: 6, overflow: 'hidden' },
  suggest: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.bg },
  suggestTxt: { fontSize: 15, color: c.text },
  err: { color: '#E2645C', fontSize: 13, marginTop: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnGhost: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: c.border },
  btnGhostTxt: { color: c.textMuted, fontWeight: '700', fontSize: 15 },
  btn: { flex: 2, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pressed: { opacity: 0.7 },
});
