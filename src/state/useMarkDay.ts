import { useState } from 'react';
import { Alert } from 'react-native';
import { useApp, uid } from './AppContext';
import { packagesOpenedAfter } from '../domain/reducer';
import type { LensPackage } from '../domain/types';

type Status = 'worn' | 'notWorn' | 'glasses';
/** "Taktım" on a day before the package was opened: the person chooses whether the opening date moves to that day. */
export type OpeningPrompt = { date: string; later: LensPackage[] };

/**
 * Saves one day's shared answer. "Taktım" on a day before the package was opened does not move the opening
 * date by itself: `prompt` is set and the screen shows the choice (OpeningChoice). `resolve(true)` moves the
 * opening date (and so the counters); `resolve(false)` keeps it and saves only that day's answer.
 * The choice is drawn by the app itself, so it works the same in the web preview and on the phone.
 */
export function useMarkDay() {
  const { state, dispatch } = useApp();
  const [prompt, setPrompt] = useState<OpeningPrompt | null>(null);
  const markDay = async (date: string, status: Status) => {
    const covered = state.packages.find(p => p.openedOn <= date && (!p.closedOn || date <= p.closedOn));
    if (covered) { await dispatch({ type: 'checkIn', id: uid(), packageId: covered.id, date, status, automatic: false }); return; }
    if (status !== 'worn') { await dispatch({ type: 'dailyStatus', id: uid(), date, status, automatic: false }); return; }
    const later = packagesOpenedAfter(state, date);
    if (!later.length) { Alert.alert('Bu gün için paket yok', 'Lens taktığın günü kaydetmek için önce o gün açtığın paketi ekle.'); return; }
    setPrompt({ date, later });
  };
  const resolve = async (moveOpening: boolean) => {
    const current = prompt; setPrompt(null);
    if (!current) return;
    await dispatch({ type: 'dailyStatus', id: uid(), date: current.date, status: 'worn', automatic: false, ...(moveOpening ? { moveOpening: true } : { keepOpening: true }) });
  };
  return { markDay, prompt, resolve, cancel: () => setPrompt(null) };
}
