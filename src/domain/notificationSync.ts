import type { Reminder } from './effects.ts';

export type ExistingReminder = { id: string; owner?: unknown; body?: string | null };
/** Keep unchanged OS jobs. Cancelling all on every journal/appearance edit can lose due reminders. */
export function reminderDiff(existing: ExistingReminder[], desired: Reminder[]) {
  const wanted = new Map(desired.map(r => [r.key, r]));
  const owned = existing.filter(r => r.owner === 'lens-takip');
  const unchanged = new Set(owned.filter(r => wanted.has(r.id) && wanted.get(r.id)!.body === r.body).map(r => r.id));
  return {
    cancel: owned.filter(r => !unchanged.has(r.id)).map(r => r.id),
    schedule: desired.filter(r => !unchanged.has(r.key)),
    keep: owned.filter(r => unchanged.has(r.id)).map(r => r.id),
  };
}
