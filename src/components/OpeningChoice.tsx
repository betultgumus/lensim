import React from 'react';
import { View } from 'react-native';
import { Button, Copy, Sheet } from './ui';
import { formatDate } from '../domain/dates';
import type { OpeningPrompt } from '../state/useMarkDay';

/** Asks whether a "Taktım" day before the package opening also moves the opening date. Nothing is changed until a choice is made. */
export function OpeningChoice({ prompt, onChoose, onCancel }: { prompt: OpeningPrompt | null; onChoose: (moveOpening: boolean) => Promise<unknown>; onCancel: () => void }) {
  if (!prompt) return null;
  const day = formatDate(prompt.date); const opened = formatDate(prompt.later[0]!.openedOn);
  const eyes = prompt.later.length === 2 ? 'Sağ ve sol paketin' : prompt.later[0]!.eye === 'right' ? 'Sağ göz paketin' : 'Sol göz paketin';
  return <Sheet visible title={`${day} lens taktın`} onClose={onCancel}>
    <Copy size={15}>{eyes} {opened} tarihinde açılmış görünüyor. Paketi o gün açtıysan açılış tarihini {day} yapabilirsin; istemezsen yalnızca bu günün cevabı kaydedilir.</Copy>
    <View style={{ gap: 10 }}>
      <Button title={`Açılışı ${day} yap`} icon="calendar-outline" onPress={() => onChoose(true)}/>
      <Copy size={13} muted>Açık gün, pakette geçen gün ve kalan gün buna göre güncellenir.</Copy>
      <Button title="Açılış tarihi aynı kalsın" secondary outlined onPress={() => onChoose(false)}/>
      <Copy size={13} muted>Paket {opened} tarihinden saymaya devam eder; {day} takvimde “Taktım” görünür.</Copy>
      <Button title="Vazgeç" secondary onPress={onCancel}/>
    </View>
  </Sheet>;
}
