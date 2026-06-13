// Buduje paczkę aktualizacji OTA (self-hosted, protokół Expo Updates v1) i zapisuje
// ją do public/updates/, skąd serwuje ją Vercel. Po `node scripts/build-ota.mjs`
// zrób `git push` — apka pobierze nowy bundle JS sama przy starcie (bez nowego APK).
//
// Zmiany NATYWNE (nowe biblioteki natywne) nadal wymagają przebudowy APK.

import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://smieci-ruby.vercel.app';
const RUNTIME = '1';            // musi pasować do app.json -> expo.runtimeVersion
const BOUNDARY = 'expo-bound';  // musi pasować do vercel.json -> headers content-type
const root = process.cwd();
const TMP = path.join(root, '.ota-tmp');
const PUB = path.join(root, 'public', 'updates');

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', json: 'application/json',
  ttf: 'font/ttf', otf: 'font/otf', js: 'application/javascript',
};

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root });
}

// 1. Eksport bundla Android (Hermes) + assetów.
fs.rmSync(TMP, { recursive: true, force: true });
run(`npx expo export --platform android --output-dir ".ota-tmp"`);

// 2. Wczytaj metadane eksportu.
const meta = JSON.parse(fs.readFileSync(path.join(TMP, 'metadata.json'), 'utf8'));
const fm = meta.fileMetadata.android;
if (!fm?.bundle) throw new Error('Brak fileMetadata.android.bundle w metadata.json');

const id = crypto.randomUUID();
const createdAt = new Date().toISOString();
const outDir = path.join(PUB, id);

function copyAndHash(rel) {
  const src = path.join(TMP, rel);
  const buf = fs.readFileSync(src);
  const dst = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, buf);
  return {
    hash: crypto.createHash('sha256').update(buf).digest('base64url'),
    key: crypto.createHash('md5').update(buf).digest('hex'),
    url: `${BASE}/updates/${id}/${rel.split(path.sep).join('/')}`,
  };
}

const la = copyAndHash(fm.bundle);
const launchAsset = { hash: la.hash, key: la.key, contentType: 'application/javascript', url: la.url };

const assets = (fm.assets || []).map((a) => {
  const r = copyAndHash(a.path);
  return {
    hash: r.hash, key: r.key,
    contentType: MIME[a.ext] || 'application/octet-stream',
    fileExtension: `.${a.ext}`,
    url: r.url,
  };
});

const manifest = { id, createdAt, runtimeVersion: RUNTIME, launchAsset, assets, metadata: {}, extra: {} };

// 3. Zbuduj statyczną odpowiedź multipart/mixed (część "manifest").
const json = JSON.stringify(manifest);
const body =
  `--${BOUNDARY}\r\n`
  + 'Content-Disposition: form-data; name="manifest"\r\n'
  + 'Content-Type: application/json\r\n\r\n'
  + `${json}\r\n`
  + `--${BOUNDARY}--\r\n`;

fs.mkdirSync(PUB, { recursive: true });
fs.writeFileSync(path.join(PUB, 'manifest'), body);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nOTA gotowe: update ${id}, assetów: ${assets.length}, runtimeVersion ${RUNTIME}`);
console.log('Teraz: git add -A && git commit && git push  → apka zaktualizuje się sama.');
