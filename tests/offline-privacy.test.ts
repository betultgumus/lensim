// Lensim holds health-related data: it must work without an account, sign-in or network,
// keep records on the device and never send them to a cloud service. These checks guard that.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defaultState } from '../src/domain/types.ts';

const root = join(import.meta.dirname, '..');
const read = (file: string) => readFileSync(join(root, file), 'utf8');
function sources(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap(name => {
    const path = join(dir, name);
    if (statSync(join(root, path)).isDirectory()) return sources(path);
    return /\.(ts|tsx|json)$/.test(name) ? [path] : [];
  });
}
const appSources = [...sources('app'), ...sources('src')];

test('no cloud, account, analytics or sync packages are installed', () => {
  const pkg = JSON.parse(read('package.json'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  const banned = /firebase|firestore|supabase|amplify|auth0|expo-auth-session|google-signin|appwrite|realm|analytics|segment|sentry|mixpanel|amplitude|posthog|onesignal|axios/i;
  assert.deepEqual(deps.filter(d => banned.test(d)), []);
});

test('app code makes no network requests and registers no push token', () => {
  const banned = /\bfetch\s*\(|XMLHttpRequest|new WebSocket|EventSource|sendBeacon|getExpoPushTokenAsync|getDevicePushTokenAsync|firebase|https?:\/\//;
  const offenders = appSources.filter(file => banned.test(read(file))).map(file => relative(root, join(root, file)));
  assert.deepEqual(offenders, []);
});

test('there is no sign-up or sign-in route; first launch goes straight to setup', () => {
  const routes = sources('app').map(file => file.replace(/\\/g, '/'));
  assert.deepEqual(routes.filter(route => /login|signin|sign-in|signup|sign-up|register|auth|account/i.test(route)), []);
  assert.match(read('app/index.tsx'), /onboarded \? '\/\(tabs\)' : '\/onboarding'/);
  assert.match(read('app/(tabs)/_layout.tsx'), /if \(!state\.onboarded\) return <Redirect href="\/onboarding"\/>/);
  const fresh = defaultState();
  assert.equal(fresh.onboarded, false);
  assert.deepEqual([fresh.boxes.length, fresh.packages.length, fresh.checkIns.length, fresh.dailyStatuses.length, fresh.prescriptionHistory.length], [0, 0, 0, 0, 0]);
});

test('records stay on the device: SQLite natively, IndexedDB on web', () => {
  const native = read('src/data/database.ts');
  assert.match(native, /from 'expo-sqlite'/);
  assert.match(native, /openDatabaseAsync\('lens-takip\.db'\)/);
  const web = read('src/data/database.web.ts');
  assert.match(web, /indexedDB\.open\('lens-takip-web-preview'/);
});

test('OS cloud backup is off on Android and over-the-air updates are disabled', () => {
  const config = read('app.config.ts');
  assert.match(config, /allowBackup: false/);
  assert.match(config, /updates: \{ enabled: false \}/);
});

test('backup is a user-started local .json file, not an upload', () => {
  const screen = read('app/settings/backup.tsx');
  assert.match(screen, /lensim-yedek-\$\{[^}]+\}\.json/);
  assert.match(screen, /otomatik bulut yedeği yoktur/);
  assert.match(read('src/services/backupFile.web.ts'), /type: 'application\/json'/);
  assert.match(read('src/services/backupFile.ts'), /createFile\(name, 'application\/json'\)/);
});

test('reminders are scheduled as local device notifications', () => {
  const notifications = read('src/services/notifications.ts');
  assert.match(notifications, /scheduleNotificationAsync/);
  assert.match(read('src/services/notifications.web.ts'), /requestNotifications\(\): Promise<boolean> \{ return false; \}/);
});

test('no sample, demo or test records ship in the app', () => {
  const offenders = appSources.filter(file => /test paketi|['"`]Demo\b|· Demo/i.test(read(file)));
  assert.deepEqual(offenders, []);
});

test('the preserved Flutter app also has no account or cloud sign-in flow', () => {
  const settings = read('lensim_app/lib/ui/settings_screen.dart');
  assert.doesNotMatch(settings, /Google ile giriş yap|Google ile giriş ve bulut yedeği|HESAP VE YEDEK/);
  assert.match(settings, /Hesap veya internet gerekmez/);
  const readme = read('lensim_app/README.md');
  assert.doesNotMatch(readme, /Google ile giriş ve bulut yedeği \(Firebase\)/);
});
