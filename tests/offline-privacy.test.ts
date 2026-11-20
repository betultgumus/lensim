// Guest mode is fully local. Optional signed-in accounts back up to a user-owned cloud row.
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

test('only the optional account client is installed; advertising and analytics SDKs are absent', () => {
  const pkg = JSON.parse(read('package.json'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  assert.ok(deps.includes('@supabase/supabase-js'));
  const banned = /firebase|firestore|amplify|auth0|appwrite|realm|analytics|segment|sentry|mixpanel|amplitude|posthog|onesignal|google-mobile-ads|admob/i;
  assert.deepEqual(deps.filter(d => banned.test(d)), []);
});

test('app code makes no network requests and registers no push token', () => {
  const banned = /\bfetch\s*\(|XMLHttpRequest|new WebSocket|EventSource|sendBeacon|getExpoPushTokenAsync|getDevicePushTokenAsync|firebase/;
  const offenders = appSources.filter(file => banned.test(read(file))).map(file => relative(root, join(root, file)));
  assert.deepEqual(offenders, []);
  // The only public URLs in an app route are user-opened health references; they are not fetched by Lensim.
  const help = read('app/help.tsx');
  assert.match(help, /Linking\.openURL\(url\)/);
  assert.equal((help.match(/https:\/\//g) ?? []).length, 4);
});

test('account is optional; first launch goes straight to lens setup', () => {
  const routes = sources('app').map(file => file.replace(/\\/g, '/'));
  assert.ok(routes.some(route => route === 'app/account.tsx'));
  assert.ok(routes.some(route => route === 'app/auth/callback.tsx'));
  assert.match(read('app/account.tsx'), /Misafir olarak kullan/);
  assert.match(read('app/account.tsx'), /Google ile devam et/);
  assert.match(read('app/account.tsx'), /E-posta ile giriş yap/);
  assert.match(read('app/index.tsx'), /if \(!useApp\(\)\.state\.onboarded\) return <Redirect href="\/onboarding"\/>/);
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

test('guest JSON backup is separate from optional account cloud sync', () => {
  const screen = read('app/settings/backup.tsx');
  assert.match(screen, /lensim-yedek-\$\{[^}]+\}\.json/);
  assert.doesNotMatch(screen, /services\/supabase/);
  assert.match(read('src/services/accountSync.ts'), /writeCloudSnapshot/);
  assert.match(read('supabase/migrations/202611200001_user_backups.sql'), /enable row level security/);
  assert.match(read('supabase/migrations/202611200002_account_deletion.sql'), /delete from auth\.users where id = current_user_id/);
  assert.match(read('src/services/backupFile.web.ts'), /type: 'application\/json'/);
  assert.match(read('src/services/backupFile.ts'), /createFile\(name, 'application\/json'\)/);
});

test('research preference is local-only and no data transfer or ad network is active', () => {
  const fresh = defaultState();
  assert.equal(fresh.settings.researchSharing, 'undecided');
  assert.match(read('src/domain/privacy.content.json'), /araştırma verisi toplamıyor|araştırma amacıyla paylaşmıyor/);
  assert.doesNotMatch(read('src/services/accountSync.ts'), /researchSharing/);
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

