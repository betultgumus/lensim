import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Copy, Screen, SegmentedControl } from '../src/components/ui';
import { useApp } from '../src/state/AppContext';
import { addDays, daysOpen, durationLabel, formatDate, packageMascotLevel, shortDate } from '../src/domain/dates';
import { dayTone, palette } from '../src/design/dayTone';
import { eyeLabel, type Eye, type LensBox, type LensPackage } from '../src/domain/types';

const typeNames: Record<LensBox['lensType'], string> = { spherical: 'Küresel', toric: 'Torik', multifocal: 'Multifokal', colored: 'Renkli' };

/** State colours, the same three steps as the home lens card (fresh · change near · overdue). */
const tones = {
  1: { accent: '#0754C8', soft: '#E8F2FF', border: '#C6DCF6' },
  2: { accent: '#9A4A00', soft: '#FFF0E2', border: '#F6C28C' },
  3: { accent: palette.danger, soft: '#FDECEE', border: '#F3C3C8' },
} as const;

/** One label/value line of the facts list; a hairline separates the lines. */
function Fact({ label, value, mono = false, last = false }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderColor: '#E6EEF8' }}>
    <Copy size={14} style={{ color: palette.inkSoft, lineHeight: 19 }}>{label}</Copy>
    <Copy size={15} bold mono={mono} style={{ flex: 1, minWidth: 0, textAlign: 'right', color: palette.ink, lineHeight: 20 }}>{value}</Copy>
  </View>;
}

/** Hero: the day count of this eye's package, its status and a thin progress line, coloured by the package state. */
function Hero({ pack, box, today }: { pack: LensPackage; box?: LensBox; today: string }) {
  const { state } = useApp();
  const duration = pack.durationDaysSnapshot ?? box?.durationDays ?? 30; const daily = duration === 1;
  const elapsed = daysOpen(pack.openedOn, today); const remaining = duration - elapsed;
  const level = daily ? 1 : packageMascotLevel(duration, elapsed); const tone = tones[level];
  const monthWorn = new Set(state.checkIns.filter(c => c.packageId === pack.id && c.status === 'worn' && c.date.slice(0, 7) === today.slice(0, 7)).map(c => c.date)).size;
  const count = daily ? String(monthWorn) : String(elapsed); const total = daily ? '/ay' : `/${duration}`;
  const status = daily ? (box?`Kutuda ${box.lensesRemaining} lens`:'Günlük kullanım takibi') : remaining < 0 ? `Süre ${-remaining} gün aştı` : remaining === 0 ? 'Bugün son gün' : `${remaining} gün kaldı`;
  const eyeColor = pack.eye === 'right' ? palette.right : palette.leftText;
  return <Card style={{ borderRadius: 20, padding: 18, gap: 14, borderColor: tone.border, borderWidth: 1.5 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Copy bold mono size={13} style={{ color: eyeColor, letterSpacing: .8, lineHeight: 18 }}>{eyeLabel(pack.eye).toLocaleUpperCase('tr-TR')} GÖZ</Copy>
      <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: '#9DB3D1' }}/>
      <Copy bold mono size={13} style={{ color: palette.inkSoft, letterSpacing: .8, lineHeight: 18 }}>{durationLabel(duration).toLocaleUpperCase('tr-TR')}</Copy>
    </View>
    <View accessible accessibilityLabel={daily ? `Bu ay ${count} gün taktın. ${status}.` : `${duration} günlük paketin ${elapsed}. günü. ${status}.`} style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Copy bold size={56} style={{ color: level === 3 ? tone.accent : palette.ink, lineHeight: 60, letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{count}</Copy>
        <Copy mono size={22} style={{ color: '#8EA3C2', lineHeight: 28, marginLeft: 2 }}>{total}</Copy>
      </View>
      <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: tone.soft, borderWidth: 1, borderColor: tone.border, marginBottom: 8 }}>
        <Copy bold size={14} style={{ color: tone.accent, lineHeight: 18 }}>{status}</Copy>
      </View>
    </View>
    {!daily && <View style={{ height: 6, borderRadius: 3, backgroundColor: '#E6EEF8', overflow: 'hidden' }}><View style={{ width: `${Math.min(1, elapsed / duration) * 100}%`, height: '100%', borderRadius: 3, backgroundColor: tone.accent }}/></View>}
  </Card>;
}

/** Package facts without repeating the hero: dates, worn days, stock and the prescription it was opened with. */
function Facts({ pack, box, today, sharedBox }: { pack: LensPackage; box?: LensBox; today: string; sharedBox: boolean }) {
  const { state } = useApp();
  const duration = pack.durationDaysSnapshot ?? box?.durationDays ?? 30; const daily = duration === 1;
  const worn = new Set(state.checkIns.filter(c => c.packageId === pack.id && c.status === 'worn' && c.date <= today).map(c => c.date)).size;
  const perEye = Math.max(1, box?.eyes.length??1);
  const reserveDays = Math.floor((box?.lensesRemaining??0) / perEye) * duration;
  const reserve = reserveDays >= 60 ? `≈ ${Math.floor(reserveDays / 30)} ay` : `≈ ${reserveDays} gün`;
  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'Paket', value: box?[box.name, box.brand, typeNames[pack.lensTypeSnapshot ?? box.lensType]].filter(Boolean).join(' · '):'Kutusuz takip' },
    { label: 'Açılış', value: formatDate(pack.openedOn) },
    ...(!daily ? [{ label: 'Değişim günü', value: formatDate(addDays(pack.openedOn, duration)) }, { label: 'Takılan gün', value: `${worn} gün` }] : []),
    ...(box ? [{ label: 'Kutuda kalan', value: `${box.lensesRemaining} lens${box.lensesRemaining > 0 ? ` · ${reserve}` : ''}${sharedBox ? ' · iki göz' : ''}` }] : []),
  ];
  return <Card style={{ borderRadius: 20, paddingHorizontal: 18, paddingVertical: 4, gap: 0 }}>
    {rows.map((r, i) => <Fact key={r.label} {...r} last={i === rows.length - 1}/>)}
  </Card>;
}

/** Day-by-day trace of this package, coloured exactly like the home calendar. */
function CycleTrace({ pack, box, today }: { pack: LensPackage; box?: LensBox; today: string }) {
  const { state } = useApp();
  const duration = pack.durationDaysSnapshot ?? box?.durationDays ?? 30;
  const start = duration === 1 ? addDays(today, -13) < pack.openedOn ? pack.openedOn : addDays(today, -13) : pack.openedOn;
  const lastDay = duration === 1 ? today : addDays(pack.openedOn, duration - 1);
  const end = lastDay > today ? lastDay : today;
  const days: string[] = []; for (let d = start; d <= end && days.length < 92; d = addDays(d, 1)) days.push(d);
  return <Card style={{ borderRadius: 20, padding: 18, gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <Copy bold size={16} style={{ lineHeight: 21 }}>Günler</Copy>
      <Copy size={13} style={{ color: palette.inkSoft, lineHeight: 18 }}>{shortDate(start)} – {shortDate(end)}</Copy>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>{days.map(day => {
      const entry = state.dailyStatuses.find(c => c.date === day); const tone = dayTone(entry); const upcoming = !entry && day > today;
      return <View key={day} accessible accessibilityLabel={`${formatDate(day)} · ${upcoming ? 'Gelecek gün' : tone.label}`} style={{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: entry ? tone.fill : upcoming ? palette.upcoming : palette.unanswered, borderWidth: day === today ? 2 : upcoming || entry?.automatic ? 1 : 0, borderStyle: entry?.automatic ? 'dashed' : 'solid', borderColor: day === today ? palette.ink : upcoming ? palette.upcomingBorder : '#7C93B5' }}>
        <Copy size={11} bold={day === today} style={{ color: entry ? tone.text : palette.inkSoft, lineHeight: 13 }}>{Number(day.slice(-2))}</Copy>
      </View>;
    })}</View>
    <Button title="Takvimde düzenle" secondary icon="calendar-outline" onPress={() => router.navigate({ pathname: '/(tabs)', params: { page: 'calendar' } })}/>
  </Card>;
}

/**
 * Cycle summary of ONE eye, opened by tapping that eye's cap on the home lens case (`?eye=left|right`).
 * With both eyes open, a switch at the top moves between them without leaving the screen.
 */
export default function CycleSummary() {
  const { state, today } = useApp(); const params = useLocalSearchParams<{ eye?: string }>();
  const active = state.packages.filter(p => !p.closedOn && p.openedOn <= today);
  const withBox = active.map(pack => ({ pack, box: state.boxes.find(b => b.id === pack.boxId) }))
    .sort((a, b) => (a.pack.eye === 'left' ? 0 : 1) - (b.pack.eye === 'left' ? 0 : 1));
  const requested: Eye | undefined = params.eye === 'left' || params.eye === 'right' ? params.eye : undefined;
  if (!withBox.length) return <Screen title="Lens döngüsü özeti" back><Copy>Açık lens paketin yok.</Copy><Button title="Yeni paket aç" icon="add" onPress={() => router.push('/package/new')}/></Screen>;
  const current = withBox.find(x => x.pack.eye === requested) ?? withBox[0]!;
  const sharedBox = withBox.length === 2 && !!withBox[0]!.box && withBox[0]!.box?.id === withBox[1]!.box?.id;
  return <Screen title="Lens döngüsü özeti" back>
    {withBox.length === 2 && <SegmentedControl label="Göz seçimi" selected={current.pack.eye} onChange={value => router.setParams({ eye: value })} options={withBox.map(x => ({ value: x.pack.eye, title: `${eyeLabel(x.pack.eye)} göz` }))}/>}
    <Hero pack={current.pack} box={current.box} today={today}/>
    <Facts pack={current.pack} box={current.box} today={today} sharedBox={sharedBox}/>
    <CycleTrace pack={current.pack} box={current.box} today={today}/>
    <Button title="Paket ayrıntısı" secondary outlined icon="open-outline" onPress={() => router.push({ pathname: '/package/[id]', params: { id: current.pack.id } })}/>
  </Screen>;
}
