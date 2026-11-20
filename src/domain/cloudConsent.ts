/**
 * Cloud backup is a separate, opt-in choice made AFTER signing in. Opening an account never uploads anything by
 * itself: records leave the device only once the person has read what is sent and turned cloud backup on with an
 * explicit action (an unticked box they tick themselves, then a button). Turning it off stops every upload at once.
 *
 * The choice is stored on this device, per account. Whether this approval is the legal basis (KVKK "açık rıza") for
 * the cloud processing is a legal decision for the publisher; this module only guarantees the technical behaviour.
 */
export const CLOUD_CONSENT_VERSION = '2026-11-20';
export type CloudConsent = { enabled: boolean; at: string; version: string };

export const cloudConsentKey = (userId: string) => `lensim-cloud-backup:${userId}`;

export function parseCloudConsent(raw: string | null | undefined): CloudConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CloudConsent>;
    if (typeof value.enabled !== 'boolean' || typeof value.at !== 'string' || typeof value.version !== 'string') return null;
    return { enabled: value.enabled, at: value.at, version: value.version };
  } catch { return null; }
}

/** Only an explicit, current "on" counts. Missing, unreadable or older-version records mean: do not upload. */
export function cloudBackupAllowed(consent: CloudConsent | null): boolean {
  return Boolean(consent && consent.enabled && consent.version === CLOUD_CONSENT_VERSION);
}

export function makeCloudConsent(enabled: boolean, now = new Date()): CloudConsent {
  return { enabled, at: now.toISOString(), version: CLOUD_CONSENT_VERSION };
}

/** Exactly what is copied to the cloud when backup is on (shown before the person turns it on). */
export const CLOUD_DATA_LIST = [
  'Lens kutuları, paketler ve açılış/kapanış tarihleri',
  'Günlük “Taktım / Takmadım / Gözlük” kayıtların ve takvim geçmişin',
  'Girdiysen lens ve gözlük numaraların (reçete değerleri)',
  'Girdiysen göz günlüğü notların',
  'Uygulama ayarların (ör. cevapsız gün varsayılanı, hatırlatma saatleri)',
] as const;
