import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { WASTE_TYPES, PickupDay, ScheduleData } from './data/schedule';

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function icsDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function summary(day: PickupDay): string {
  const labels = day.types.map((t) => `${WASTE_TYPES[t].emoji} ${WASTE_TYPES[t].label}`);
  return `Wywóz: ${labels.join(', ')}`;
}

function fold(line: string): string {
  // RFC 5545 — łamanie linii > 75 oktetów (uproszczone, ASCII-safe).
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length > 73) {
    parts.push(' ' + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  if (rest.length) parts.push(' ' + rest);
  return parts.join('\r\n');
}

export function buildICS(schedule: ScheduleData): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Smieci Bydgoszcz//Harmonogram ${schedule.year}//PL`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Wywóz śmieci',
  ];

  for (const day of schedule.days) {
    const start = day.dateObj;
    const end = new Date(start);
    end.setDate(end.getDate() + 1); // wydarzenie całodniowe
    const uid = `${day.date}-smieci@drzycimska47`;
    // przypomnienie o 18:00 dnia poprzedniego (PT6H + DTSTART? — używamy stałego triggera)
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART;VALUE=DATE:${icsDate(start)}`);
    lines.push(`DTEND;VALUE=DATE:${icsDate(end)}`);
    lines.push(fold(`SUMMARY:${summary(day)}`));
    lines.push(fold(`LOCATION:${schedule.address}`));
    lines.push(fold('DESCRIPTION:Wystaw pojemniki przed dom do 6:00 rano w dniu wywozu.'));
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push('DESCRIPTION:Jutro wywóz śmieci — wystaw pojemniki');
    // 6 godzin przed północą dnia wywozu = 18:00 dnia poprzedniego
    lines.push('TRIGGER:-PT6H');
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Eksportuje kalendarz: web → pobranie pliku, natywnie → arkusz udostępniania. */
export async function exportICS(schedule: ScheduleData): Promise<void> {
  const content = buildICS(schedule);
  const fileName = `wywoz-smieci-${schedule.year}.ics`;

  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/calendar',
      dialogTitle: 'Dodaj wywozy do kalendarza',
      UTI: 'com.apple.ical.ics',
    });
  }
}
