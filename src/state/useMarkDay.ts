import { Alert } from 'react-native';
import { useApp, uid, errorText } from './AppContext';
import { packagesOpenedAfter } from '../domain/reducer';
import { formatDate } from '../domain/dates';

type Status = 'worn' | 'notWorn' | 'glasses';

/**
 * Saves one day's shared answer. "Taktım" on a day before the package was opened asks
 * whether the package was really opened that day and, if so, moves the opening date.
 */
export function useMarkDay() {
  const { state, dispatch } = useApp();
  return async (date: string, status: Status) => {
    const covered = state.packages.find(p => p.openedOn <= date && (!p.closedOn || date <= p.closedOn));
    if (covered) { await dispatch({ type: 'checkIn', id: uid(), packageId: covered.id, date, status, automatic: false }); return; }
    if (status !== 'worn') { await dispatch({ type: 'dailyStatus', id: uid(), date, status, automatic: false }); return; }
    const later = packagesOpenedAfter(state, date);
    if (!later.length) { Alert.alert('Bu gün için paket yok', 'Lens taktığın günü kaydetmek için önce o gün açtığın paketi ekle.'); return; }
    const eyes = later.length === 2 ? 'Sağ ve sol paketin' : later[0]!.eye === 'right' ? 'Sağ göz paketin' : 'Sol göz paketin';
    Alert.alert(
      `${formatDate(date)} lens taktın mı?`,
      `${eyes} ${formatDate(later[0]!.openedOn)} tarihinde açılmış görünüyor. O gün lens taktıysan paketi ${formatDate(date)} tarihinde açmışsın demektir. Açılış tarihi ${formatDate(date)} olarak değişir ve sayaç buna göre artar.`,
      [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Evet, açılışı değiştir', onPress: () => { void dispatch({ type: 'dailyStatus', id: uid(), date, status: 'worn', automatic: false, moveOpening: true }).catch(e => Alert.alert('Kaydedilemedi', errorText(e))); } }],
    );
  };
}
