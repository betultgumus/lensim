import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Copy, Screen } from '../src/components/ui';
import { useApp } from '../src/state/AppContext';
import { addDays, daysOpen, durationLabel, formatDate, shortDate } from '../src/domain/dates';
import { dayTone, palette } from '../src/design/dayTone';
import { eyeLabel, type LensBox, type LensPackage } from '../src/domain/types';

const typeNames: Record<LensBox['lensType'], string> = { spherical: 'Küresel', toric: 'Torik', multifocal: 'Multifokal', colored: 'Renkli' };

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, backgroundColor: '#F2F7FE', borderWidth: 1, borderColor: '#DCE8F7', alignItems: 'center' }}>
    <Copy bold size={22} style={{ color: tone ?? palette.ink, lineHeight: 27, fontVariant: ['tabular-nums'] }}>{value}</Copy>
    <Copy size={12} style={{ color: palette.inkSoft, textAlign: 'center', lineHeight: 16 }}>{label}</Copy>
  </View>;
}

/** One eye's package: duration, stock, worn days and the prescription it was opened with. */
function EyeCard({ pack, box, today, sharedBox }: { pack: LensPackage; box: LensBox; today: string; sharedBox: boolean }) {
  const { state } = useApp();
  const duration = pack.durationDaysSnapshot ?? box.durationDays; const elapsed = daysOpen(pack.openedOn, today);
  const daily = duration === 1;
  const worn = new Set(state.checkIns.filter(c => c.packageId === pack.id && c.status === 'worn').map(c => c.date)).size;
  const wornThisMonth = new Set(state.checkIns.filter(c => c.packageId === pack.id && c.status === 'worn' && c.date.slice(0, 7) === today.slice(0, 7)).map(c => c.date)).size;
  const remaining = Math.max(0, duration - elapsed); const overdue = !daily && elapsed > duration;
  const perEye = Math.max(1, box.eyes.length);
  const reserveDays = Math.floor(box.lensesRemaining / perEye) * duration;
  const reserve = reserveDays >= 60 ? `yaklaşık ${Math.floor(reserveDays / 30)} ay yeter` : `yaklaşık ${reserveDays} gün yeter`;
  const rx = pack.prescriptionSnapshot ?? box.prescription; const rxText = Object.entries(rx[pack.eye] ?? {}).map(([k, v]) => `${k} ${v}`).join(' · ');
  const color = pack.eye === 'right' ? palette.right : palette.leftText;
  return <Card style={{ borderRadius: 16, gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Copy bold size={14} mono style={{ color, letterSpacing: 0.8 }}>{eyeLabel(pack.eye).toLocaleUpperCase('tr-TR')} GÖZ · {durationLabel(duration).toLocaleUpperCase('tr-TR')}</Copy>
      <Copy size={13} muted>{typeNames[pack.lensTypeSnapshot ?? box.lensType]}</Copy>
    </View>
    <Copy bold size={18}>{box.name}{box.brand ? ` · ${box.brand}` : ''}</Copy>
    {daily
      ? <View style={{ flexDirection: 'row', gap: 8 }}><Tile label="Bu ay takılan" value={String(wornThisMonth)}/><Tile label="Kutuda lens" value={String(box.lensesRemaining)}/></View>
      : <View style={{ flexDirection: 'row', gap: 8 }}><Tile label="Açık gün" value={`${elapsed}/${duration}`}/><Tile label="Takılan gün" value={String(worn)}/><Tile label={overdue ? 'Gün aşım' : remaining === 0 ? 'Bugün son gün' : 'Kalan gün'} value={overdue ? `+${elapsed - duration}` : String(remaining)} tone={overdue ? palette.danger : remaining === 0 ? palette.warning : undefined}/></View>}
    <View style={{ gap: 4 }}>
      <Copy size={15}>Açılış: {formatDate(pack.openedOn)}{!daily ? ` · Değişim: ${formatDate(addDays(pack.openedOn, duration))}` : ''}</Copy>
      <Copy size={15}>Stok: kutuda {box.lensesRemaining} lens · {reserve}{sharedBox ? ' (iki göz aynı kutudan)' : ''}</Copy>
      {!!rxText && <Copy size={14} mono style={{ color: palette.inkSoft }}>Numara · {rxText}</Copy>}
      {!!rx.color && <Copy size={14} style={{ color: palette.inkSoft }}>Renk · {rx.color}</Copy>}
    </View>
    <Button title={`${eyeLabel(pack.eye)} göz paket ayrıntısı`} secondary icon="open-outline" onPress={() => router.push({ pathname: '/package/[id]', params: { id: pack.id } })}/>
  </Card>;
}

/** Day-by-day trace of the current cycle, coloured exactly like the home calendar. */
function CycleTrace({ start, end, today }: { start: string; end: string; today: string }) {
  const { state } = useApp();
  const days: string[] = []; for (let d = start; d <= end && days.length < 92; d = addDays(d, 1)) days.push(d);
  return <Card style={{ borderRadius: 16, gap: 10 }}>
    <Copy bold>Takvim izi</Copy>
    <Copy size={14} muted>{shortDate(start)} – {shortDate(end)} · her kare bir gün</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{days.map(day => {
      const entry = state.dailyStatuses.find(c => c.date === day); const tone = dayTone(entry); const upcoming = !entry && day > today;
      return <View key={day} accessible accessibilityLabel={`${formatDate(day)} · ${upcoming ? 'Gelecek gün' : tone.label}`} style={{ width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: entry ? tone.fill : upcoming ? palette.upcoming : palette.unanswered, borderWidth: day === today ? 2 : upcoming || entry?.automatic ? 1 : 0, borderStyle: entry?.automatic ? 'dashed' : 'solid', borderColor: day === today ? palette.ink : upcoming ? palette.upcomingBorder : '#7C93B5' }}>
        <Copy size={11} bold={day === today} style={{ color: entry ? tone.text : palette.inkSoft, lineHeight: 13 }}>{Number(day.slice(-2))}</Copy>
      </View>;
    })}</View>
    <Button title="Takvimde düzenle" secondary icon="calendar-outline" onPress={() => router.navigate({ pathname: '/(tabs)', params: { page: 'calendar' } })}/>
  </Card>;
}

export default function CycleSummary() {
  const { state, today } = useApp();
  const active = state.packages.filter(p => !p.closedOn && p.openedOn <= today).sort((a, b) => (a.eye === 'right' ? 0 : 1) - (b.eye === 'right' ? 0 : 1));
  const withBox = active.flatMap(pack => { const box = state.boxes.find(b => b.id === pack.boxId); return box ? [{ pack, box }] : []; });
  if (!withBox.length) return <Screen title="Lens döngüsü özeti" back><Copy>Açık lens paketin yok.</Copy><Button title="Yeni paket aç" icon="add" onPress={() => router.push('/package/new')}/></Screen>;
  const sharedBox = withBox.length === 2 && withBox[0]!.box.id === withBox[1]!.box.id;
  const paired = withBox.length === 2 && !!withBox[0]!.pack.pairId && withBox[0]!.pack.pairId === withBox[1]!.pack.pairId;
  const start = withBox.map(x => x.pack.openedOn).sort()[0]!;
  const end = withBox.map(x => { const d = x.pack.durationDaysSnapshot ?? x.box.durationDays; return d === 1 ? today : addDays(x.pack.openedOn, d - 1); }).concat(today).sort().at(-1)!;
  const subtitle = withBox.length === 2 ? (paired ? 'İki göz · birlikte açılan paket' : 'İki göz · ayrı açılan paketler') : `${eyeLabel(withBox[0]!.pack.eye)} göz paketi`;
  return <Screen title="Lens döngüsü özeti" subtitle={subtitle} back>
    {withBox.map(({ pack, box }) => <EyeCard key={pack.id} pack={pack} box={box} today={today} sharedBox={sharedBox}/>)}
    <CycleTrace start={start} end={end} today={today}/>
  </Screen>;
}
