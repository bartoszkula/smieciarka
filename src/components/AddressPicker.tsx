import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { searchStreets, getNumbers, Street, AddressPoint } from '../data/source';
import { theme } from '../theme';

export function AddressPicker({
  visible, onClose, changeAddress,
}: {
  visible: boolean;
  onClose: () => void;
  changeAddress: (street: string, number: string) => Promise<boolean>;
}) {
  const [streetInput, setStreetInput] = useState('');
  const [suggestions, setSuggestions] = useState<Street[]>([]);
  const [selected, setSelected] = useState<Street | null>(null);
  const [numbers, setNumbers] = useState<AddressPoint[]>([]);
  const [numberInput, setNumberInput] = useState('');
  const [loadingStreets, setLoadingStreets] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStreetInput(''); setSuggestions([]); setSelected(null);
    setNumbers([]); setNumberInput(''); setErr(null);
  }, []);

  const onStreetChange = useCallback(async (text: string) => {
    setStreetInput(text);
    setSelected(null);
    setNumbers([]);
    setErr(null);
    if (text.trim().length < 2) { setSuggestions([]); return; }
    setLoadingStreets(true);
    try {
      setSuggestions(await searchStreets(text));
    } catch {
      setErr('Nie udało się pobrać listy ulic (sprawdź połączenie).');
    } finally {
      setLoadingStreets(false);
    }
  }, []);

  const pickStreet = useCallback(async (s: Street) => {
    setSelected(s);
    setStreetInput(s.street);
    setSuggestions([]);
    setLoadingNumbers(true);
    setErr(null);
    try {
      const pts = await getNumbers(s.id);
      pts.sort((a, b) => (parseInt(a.buildingNumber, 10) || 0) - (parseInt(b.buildingNumber, 10) || 0));
      setNumbers(pts);
    } catch {
      setErr('Nie udało się pobrać numerów dla tej ulicy.');
    } finally {
      setLoadingNumbers(false);
    }
  }, []);

  const submit = useCallback(async () => {
    const street = (selected?.street ?? streetInput).trim();
    const number = numberInput.trim();
    if (!street || !number) { setErr('Podaj ulicę i numer.'); return; }
    setSaving(true);
    setErr(null);
    const ok = await changeAddress(street, number);
    setSaving(false);
    if (ok) { reset(); onClose(); }
    else setErr(`Nie znaleziono harmonogramu dla „${street} ${number}". Sprawdź ulicę i numer.`);
  }, [selected, streetInput, numberInput, changeAddress, reset, onClose]);

  const filteredNumbers = numberInput.trim()
    ? numbers.filter((n) => n.buildingNumber.startsWith(numberInput.trim()))
    : numbers;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handleBar} />
          <Text style={styles.title}>Zmień adres</Text>
          <Text style={styles.hint}>Wpisz nazwę ulicy (Bydgoszcz) i wybierz numer.</Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Ulica</Text>
            <TextInput
              style={styles.input}
              value={streetInput}
              onChangeText={onStreetChange}
              placeholder="np. Drzycimska"
              autoCapitalize="characters"
              placeholderTextColor={theme.textFaint}
            />
            {loadingStreets && <ActivityIndicator style={{ marginTop: 6 }} color={theme.primary} />}
            {suggestions.length > 0 && (
              <View style={styles.suggestBox}>
                {suggestions.map((s) => (
                  <Pressable key={s.id} style={({ pressed }) => [styles.suggest, pressed && styles.pressed]} onPress={() => pickStreet(s)}>
                    <Text style={styles.suggestTxt}>{s.street}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>Numer</Text>
            <TextInput
              style={styles.input}
              value={numberInput}
              onChangeText={(t) => { setNumberInput(t); setErr(null); }}
              placeholder="np. 47"
              keyboardType="default"
              placeholderTextColor={theme.textFaint}
            />
            {loadingNumbers && <ActivityIndicator style={{ marginTop: 6 }} color={theme.primary} />}
            {selected && numbers.length > 0 && (
              <View style={styles.chips}>
                {filteredNumbers.slice(0, 40).map((n) => (
                  <Pressable
                    key={n.id}
                    style={({ pressed }) => [styles.chip, numberInput.trim() === n.buildingNumber && styles.chipActive, pressed && styles.pressed]}
                    onPress={() => { setNumberInput(n.buildingNumber); setErr(null); }}
                  >
                    <Text style={[styles.chipTxt, numberInput.trim() === n.buildingNumber && styles.chipTxtActive]}>{n.buildingNumber}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {err && <Text style={styles.err}>⚠️ {err}</Text>}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.btnGhostTxt}>Anuluj</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.btn, pressed && styles.pressed]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Pobierz harmonogram</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    maxHeight: '85%', alignSelf: 'center', width: '100%', maxWidth: 460,
  },
  handleBar: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '800', color: theme.text },
  hint: { fontSize: 13, color: theme.textMuted, marginTop: 2, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: theme.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: theme.text,
  },
  suggestBox: { backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginTop: 6, overflow: 'hidden' },
  suggest: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.bg },
  suggestTxt: { fontSize: 15, color: theme.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipTxt: { fontSize: 14, color: theme.text, fontWeight: '600' },
  chipTxtActive: { color: '#fff' },
  err: { color: '#B71C1C', fontSize: 13, marginTop: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnGhost: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: theme.border },
  btnGhostTxt: { color: theme.textMuted, fontWeight: '700', fontSize: 15 },
  btn: { flex: 2, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pressed: { opacity: 0.7 },
});
