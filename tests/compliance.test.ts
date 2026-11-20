// Google Play / KVKK in-app requirements: opt-in cloud backup, real deletion, legal texts and the medical notice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLOUD_CONSENT_VERSION, cloudBackupAllowed, makeCloudConsent, parseCloudConsent } from '../src/domain/cloudConsent.ts';
import { MEDICAL_DISCLAIMER, MISSING, fillLegal, missingLegalFields } from '../src/domain/legal.ts';

const root = join(import.meta.dirname, '..');
const read = (file: string) => readFileSync(join(root, file), 'utf8');

test('cloud backup is off unless an explicit, current approval is stored', () => {
  assert.equal(cloudBackupAllowed(null), false);
  assert.equal(cloudBackupAllowed(parseCloudConsent(null)), false);
  assert.equal(cloudBackupAllowed(parseCloudConsent('{broken')), false);
  assert.equal(cloudBackupAllowed(parseCloudConsent(JSON.stringify({ enabled: 'yes', at: 'x', version: CLOUD_CONSENT_VERSION }))), false);
  assert.equal(cloudBackupAllowed(makeCloudConsent(false)), false);
  assert.equal(cloudBackupAllowed({ ...makeCloudConsent(true), version: 'older' }), false);
  assert.equal(cloudBackupAllowed(parseCloudConsent(JSON.stringify(makeCloudConsent(true)))), true);
});

test('signing in alone never uploads: every sync path is gated by the cloud backup choice', () => {
  const auth = read('src/state/AuthContext.tsx');
  assert.match(auth, /inFlight\.current \|\| cloudBackup !== true\) return;/);
  assert.match(auth, /!session \|\| cloudBackup !== true \|\| app\.loading/);
  // Sign-out only syncs (and clears the phone) when cloud backup is on; otherwise records stay as guest records.
  assert.match(auth, /if \(cloudBackup === true\) \{\s*\/\/ Keep the account copy safe/);
  assert.match(auth, /if \(cloudBackup === true\) await app\.dispatch\(\{ type: 'reset' \}\)/);
  // The approval box starts unticked and the button is disabled until it is ticked.
  const card = read('src/components/CloudBackupCard.tsx');
  assert.match(card, /const \[agreed, setAgreed\] = useState\(false\)/);
  assert.match(card, /disabled=\{!agreed\}/);
});

test('account deletion is real, server-side, verified and only reported after it finished', () => {
  const sql = read('supabase/migrations/202611200002_account_deletion.sql');
  assert.match(sql, /delete from public\.user_backup_history where user_id = current_user_id/);
  assert.match(sql, /delete from public\.user_backups where user_id = current_user_id/);
  assert.match(sql, /delete from auth\.users where id = current_user_id/);
  assert.match(sql, /raise exception 'account_deletion_incomplete'/);
  assert.match(sql, /revoke all on function public\.delete_my_lensim_account\(\) from public, anon/);
  const client = read('src/services/supabase.ts');
  assert.match(client, /rpc\('delete_my_lensim_account'\)/);
  assert.match(client, /functions\.invoke<\{ deleted\?: boolean \}>\('delete-account'/);
  assert.match(client, /Hesap silme doğrulanamadı/);
  const screen = read('app/account.tsx');
  assert.match(screen, /Hesabımı sil/);
  // Success text is set only after `await auth.deleteAccount` resolved.
  assert.match(screen, /await auth\.deleteAccount\(keep === 'keep'\);\s*setSure\(false\); onClose\(\);\s*onDone\(/);
});

test('privacy hub: device wipe, cloud copy deletion, policy and KVKK are reachable without an account', () => {
  const privacy = read('app/settings/privacy.tsx');
  assert.match(privacy, /Cihazımdaki tüm verileri sil/);
  assert.match(privacy, /auth\.wipeDevice\(\)/);
  assert.match(privacy, /router\.push\('\/settings\/policy'\)/);
  assert.match(privacy, /router\.push\('\/settings\/kvkk'\)/);
  assert.doesNotMatch(read('app/settings/policy.tsx'), /useAuth|session/);
  // KVKK notice is information only: no consent control on that screen.
  assert.doesNotMatch(read('app/settings/kvkk.tsx'), /Checkbox|Switch|onayl/i);
  const settings = read('app/(tabs)/settings.tsx');
  for (const route of ['/account', '/settings/privacy', '/about', '/settings/notifications']) assert.ok(settings.includes(`'${route}'`), route);
});

test('Hakkında shows the exact medical disclaimer', () => {
  assert.match(read('app/about.tsx'), /\{MEDICAL_DISCLAIMER\}/);
  assert.match(MEDICAL_DISCLAIMER, /^Lensim bir tıbbi cihaz değildir\. .*göz hekiminize danışınız\.$/);
  const policy = JSON.parse(read('src/domain/privacy.content.json')) as Array<{ title: string; body: string }>;
  assert.equal(policy.find(s => s.title === 'Tıbbi açıklama')?.body, MEDICAL_DISCLAIMER);
  assert.ok(JSON.parse(read('store/metadata.tr-TR.json')).description.includes(MEDICAL_DISCLAIMER));
});

test('legal texts never invent publisher facts or a legal basis', () => {
  assert.equal(fillLegal('{publisher} · {basisCloud}', {}), `${MISSING} · ${MISSING}`);
  assert.equal(fillLegal('{publisher}', { publisherName: 'X Ltd.' }), 'X Ltd.');
  const empty = JSON.parse(read('release.config.json'));
  assert.ok(missingLegalFields(empty).length === 0 || read('scripts/check-release.cjs').includes('kvkkLegalBasisCloud'));
  assert.match(read('scripts/check-release.cjs'), /accountDeletionUrl/);
});

test('no unnecessary permissions; no exact-alarm-by-default or ad ID', () => {
  const config = read('app.config.ts');
  assert.doesNotMatch(config, /USE_EXACT_ALARM/);
  for (const p of ['RECORD_AUDIO', 'READ_CONTACTS', 'com.google.android.gms.permission.AD_ID']) assert.ok(config.includes(`'android.permission.${p}'`) || config.includes(`'${p}'`), p);
  assert.doesNotMatch(config, /ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|android\.permission\.CAMERA'|READ_SMS|READ_CALL_LOG/);
});
