import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { usePrefs } from '../prefs';
import { Theme } from '../theme';

// Przybliżona projekcja: equirectangular z korektą długości geogr. na szer. ~52°.
// To zwykła, poglądowa mapka — nie kartografia.
const LON0 = 13.9;
const LAT_TOP = 54.95;
const KX = 0.6157; // cos(52°) — żeby kraj nie był za szeroki
const S = 16;
const px = (lon: number) => (lon - LON0) * KX * S;
const py = (lat: number) => (LAT_TOP - lat) * S;

// Uproszczony kontur Polski (lon, lat), zgodnie z ruchem wskazówek zegara od NW.
const BORDER: [number, number][] = [
  [14.25, 53.93], [15.5, 54.2], [16.2, 54.28], [17.0, 54.45], [18.4, 54.6],
  [18.7, 54.45], [19.3, 54.4], [19.65, 54.45], [20.5, 54.37], [21.5, 54.35],
  [22.8, 54.4], [23.5, 54.0], [23.9, 53.0], [23.5, 52.6], [23.2, 52.3],
  [23.6, 52.0], [24.1, 50.9], [22.6, 49.6], [22.9, 49.05], [21.8, 49.4],
  [20.9, 49.3], [19.8, 49.2], [19.2, 49.4], [18.6, 49.5], [18.0, 49.7],
  [17.3, 50.0], [16.4, 50.25], [15.4, 50.8], [14.95, 50.86], [14.75, 51.5],
  [14.6, 52.0], [14.75, 52.7], [14.15, 52.85], [14.2, 53.05], [14.4, 53.3],
  [14.25, 53.7],
];

interface City { name: string; lon: number; lat: number; covered: boolean }

// Docelowo 10 największych miast. Na razie pokryta tylko Bydgoszcz.
export const CITIES: City[] = [
  { name: 'Warszawa', lon: 21.01, lat: 52.23, covered: false },
  { name: 'Kraków', lon: 19.94, lat: 50.06, covered: false },
  { name: 'Wrocław', lon: 17.04, lat: 51.11, covered: false },
  { name: 'Łódź', lon: 19.46, lat: 51.76, covered: false },
  { name: 'Poznań', lon: 16.93, lat: 52.41, covered: false },
  { name: 'Gdańsk', lon: 18.65, lat: 54.35, covered: false },
  { name: 'Szczecin', lon: 14.55, lat: 53.43, covered: false },
  { name: 'Lublin', lon: 22.57, lat: 51.25, covered: false },
  { name: 'Bydgoszcz', lon: 18.00, lat: 53.12, covered: true },
  { name: 'Białystok', lon: 23.16, lat: 53.13, covered: false },
];

const PAD = 7;
const MAX_X = Math.max(...BORDER.map(([lon]) => px(lon)));
const MAX_Y = Math.max(...BORDER.map(([, lat]) => py(lat)));
const VB_W = MAX_X + PAD * 2;
const VB_H = MAX_Y + PAD * 2;

const PATH_D =
  BORDER.map(([lon, lat], i) => `${i ? 'L' : 'M'}${px(lon).toFixed(1)} ${py(lat).toFixed(1)}`).join(' ') + ' Z';

export function CoverageMap() {
  const { palette, t } = usePrefs();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View>
      <View style={styles.mapBox}>
        <Svg width="100%" height="100%" viewBox={`${-PAD} ${-PAD} ${VB_W} ${VB_H}`}>
          <Path
            d={PATH_D}
            fill={palette.todayGlow}
            stroke={palette.textMuted}
            strokeWidth={1}
            strokeLinejoin="round"
          />
          {CITIES.map((c) => {
            const x = px(c.lon);
            const y = py(c.lat);
            return (
              <React.Fragment key={c.name}>
                <Circle
                  cx={x}
                  cy={y}
                  r={c.covered ? 3.2 : 1.8}
                  fill={c.covered ? palette.primary : 'transparent'}
                  stroke={c.covered ? palette.primary : palette.textFaint}
                  strokeWidth={c.covered ? 0 : 1}
                />
                {c.covered && (
                  <SvgText
                    x={x + 4.5}
                    y={y + 1.6}
                    fontSize={5}
                    fontWeight="bold"
                    fill={palette.text}
                  >
                    {c.name}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: palette.primary }]} />
          <Text style={styles.legendTxt}>{t('coverage.covered')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dotHollow, { borderColor: palette.textFaint }]} />
          <Text style={styles.legendTxt}>{t('coverage.planned')}</Text>
        </View>
      </View>

      <Text style={styles.note}>{t('coverage.note')}</Text>
    </View>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  mapBox: { width: '100%', aspectRatio: VB_W / VB_H, alignSelf: 'center' },
  legend: { flexDirection: 'row', gap: 18, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotHollow: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, backgroundColor: 'transparent' },
  legendTxt: { fontSize: 13, color: c.textMuted },
  note: { fontSize: 12.5, color: c.textFaint, lineHeight: 17, marginTop: 10, textAlign: 'center' },
});
