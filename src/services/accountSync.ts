import { mergeAccountStates } from './accountMerge';
import type { AppState } from '../domain/types';
import { readCloudSnapshot, writeCloudSnapshot } from './supabase.ts';
export { mergeAccountStates } from './accountMerge';

const hasRecords = (s: AppState) => Boolean(s.onboarded || s.boxes.length || s.packages.length || s.dailyStatuses.length || s.prescriptionHistory.length || s.journal.length || s.cycles.length);
const dataFingerprint = (s: AppState) => JSON.stringify({
  onboarded: s.onboarded, stock: s.stock, profiles: s.profiles, cycles: s.cycles,
  movements: s.movements, auxiliary: s.auxiliary, journal: s.journal, boxes: s.boxes,
  packages: s.packages, checkIns: s.checkIns, dailyStatuses: s.dailyStatuses,
  prescriptionHistory: s.prescriptionHistory,
});

/** A new account receives guest records. A new device restores account records. Existing data merges safely. */
export async function syncAccountState(local: AppState): Promise<{ state: AppState; changedLocal: boolean; cloudRevision: number; archived: boolean; overlappingDays: number }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const remote = await readCloudSnapshot();
    if (!remote) {
      const revision = await writeCloudSnapshot(local, 0);
      return { state: local, changedLocal: false, cloudRevision: revision, archived: false, overlappingDays: 0 };
    }
    const localHas = hasRecords(local), remoteHas = hasRecords(remote.snapshot);
    if (!localHas && remoteHas) return { state: remote.snapshot, changedLocal: true, cloudRevision: remote.revision, archived: false, overlappingDays: 0 };
    if (!remoteHas && localHas) {
      const revision = await writeCloudSnapshot(local, remote.revision);
      return { state: local, changedLocal: false, cloudRevision: revision, archived: false, overlappingDays: 0 };
    }
    if (dataFingerprint(local) === dataFingerprint(remote.snapshot)) return { state: local, changedLocal: false, cloudRevision: remote.revision, archived: false, overlappingDays: 0 };
    const merged = mergeAccountStates(local, remote.snapshot);
    try {
      const revision = await writeCloudSnapshot(merged.state, remote.revision, localHas && remoteHas);
      return { state: merged.state, changedLocal: JSON.stringify(merged.state) !== JSON.stringify(local), cloudRevision: revision, archived: localHas && remoteHas, overlappingDays: merged.overlappingDays };
    } catch (error) {
      if (!(error instanceof Error) || !/backup_revision_conflict/i.test(error.message) || attempt === 2) throw error;
    }
  }
  throw new Error('Bulut yedeği eşitlenemedi. Telefonundaki kayıtlar değişmedi; yeniden dene.');
}

export const hasAccountData = hasRecords;
