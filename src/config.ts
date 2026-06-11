// Adres pliku APK serwowanego z katalogu public/ (build webowy Vercela).
// Po zbudowaniu APK wrzuć go jako public/smieciarka.apk (lub podmień na link do GitHub Releases).
export const APK_URL = '/smieciarka.apk';

// Maksymalna szerokość kolumny w widoku webowym (tak wąsko jak na telefonie).
export const WEB_MAX_WIDTH = 460;

// Domyślny adres (gdy użytkownik nic nie zmienił). Pasuje do wbudowanego schedule.2026.json.
export const DEFAULT_STREET = 'DRZYCIMSKA';
export const DEFAULT_NUMBER = '47';

export interface AddressSel {
  street: string; // nazwa ulicy WIELKIMI literami, jak w API
  number: string; // numer budynku
}

export const DEFAULT_ADDRESS: AddressSel = { street: DEFAULT_STREET, number: DEFAULT_NUMBER };
