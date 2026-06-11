# Śmieciarka jedzie! 🗑️🚛

Kalendarz wywozu odpadów dla: **Bydgoszcz, ul. Drzycimska 47 (okręg 5), 2026**.
Jedna baza kodu (Expo / React Native) → **Android** + **web**.

## Funkcje
- **Kalendarz miesięczny** — kropki w kolorach frakcji, swipe lewo/prawo (lub strzałki) między miesiącami, podświetlenie „dziś", szczegóły po kliknięciu dnia.
- **Lista nadchodzących wywozów** — posortowana po dacie, pogrupowana miesiącami, z kartą „najbliższy wywóz" na górze.
- **Powiadomienia lokalne (Android)** — automatycznie planowane na **18:00 dnia poprzedzającego** każdy wywóz. Bez serwera, działają offline.
- **Eksport do kalendarza (.ics)** — wszystkie wywozy + przypomnienia; na webie pobiera plik, na telefonie otwiera arkusz udostępniania.

### Kolory frakcji
| Frakcja | Kolor |
|---|---|
| Odpady zmieszane | grafitowy |
| Papier | niebieski |
| Plastik i metale | żółty |
| Szkło | zielony |
| Odpady BIO | brązowy |
| Wielkogabarytowe | różowy |

## Uruchomienie

```bash
npm install
npm run web        # podgląd w przeglądarce
npm run android    # na telefonie/emulatorze (wymaga Expo Go lub builda)
```

> Powiadomienia PUSH działają tylko w aplikacji na telefonie (nie w przeglądarce).
> W Expo Go niektóre powiadomienia bywają ograniczone — do pełnej funkcjonalności zrób build:
> `npx expo run:android` lub build EAS.

## Dane
Harmonogram (`docs/harmonogram.pdf`) jest wpisany na stałe w `src/data/schedule.ts`.
Aby zaktualizować rok / adres — edytuj tablicę `RAW` i `ADDRESS` w tym pliku.

## Struktura
```
App.tsx                      zakładki + planowanie powiadomień
src/data/schedule.ts         dane harmonogramu, frakcje, kolory
src/components/CalendarView  kalendarz miesięczny ze swipe
src/components/ListView      lista + karta najbliższego wywozu
src/notifications.ts         lokalne powiadomienia (18:00 dzień przed)
src/ics.ts                   eksport .ics
```
