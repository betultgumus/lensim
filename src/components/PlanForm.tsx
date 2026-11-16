import React from 'react';
import { View } from 'react-native';
import { Chip, Field, Copy, Card, styles, Toggle } from './ui';
import { getNextReplacementDate, formatDate } from '../domain/dates';
import type { Plan } from '../domain/types';
import { DateField } from './DateField';
export type PlanDraft = { plan: Plan; start: string; manual: boolean; due: string; brand: string; power: string };
export function PlanForm({ value, onChange, details = false }: { value: PlanDraft; onChange: (v: PlanDraft) => void; details?: boolean }) {
  const patch = (p: Partial<PlanDraft>) => onChange({ ...value, ...p });
  const setPlan = (plan: Plan) => patch({ plan });
  let preview = '';
  try { preview = formatDate(value.manual && value.plan.kind !== 'daily' ? value.due : getNextReplacementDate(value.start, value.plan)); } catch { preview = 'Geçerli tarih ve süre gir.'; }
  return <>
    <Copy size={13} bold>LENSİNİN DEĞİŞİM PLANI</Copy>
    <View style={styles.wrap}>
      <Chip title="Günlük" selected={value.plan.kind === 'daily'} onPress={() => setPlan({ kind:'daily', unit:'days', interval:1 })}/>
      <Chip title="14 günlük" selected={value.plan.kind === 'fortnight'} onPress={() => setPlan({ kind:'fortnight', unit:'days', interval:14 })}/>
      <Chip title="Aylık" selected={value.plan.kind === 'monthly'} onPress={() => setPlan({ kind:'monthly', unit:'months', interval:1 })}/>
      <Chip title="Özel süre" selected={value.plan.kind === 'custom'} onPress={() => setPlan({ kind:'custom', unit:'days', interval:30 })}/>
    </View>
    {value.plan.kind === 'monthly' && <View style={styles.wrap}><Chip title="1 takvim ayı" selected={value.plan.unit === 'months'} onPress={() => setPlan({ kind:'monthly', unit:'months', interval:1 })}/><Chip title="30 gün" selected={value.plan.unit === 'days'} onPress={() => setPlan({ kind:'monthly', unit:'days', interval:30 })}/></View>}
    {value.plan.kind === 'custom' && <><Field label="Süre" numeric value={String(value.plan.interval || '')} onChange={v => setPlan({ ...value.plan, interval: Number(v) })}/><View style={styles.wrap}>{(['days','weeks','months'] as const).map(unit => <Chip key={unit} title={{ days:'Gün', weeks:'Hafta', months:'Takvim ayı' }[unit]} selected={value.plan.unit === unit} onPress={() => setPlan({ ...value.plan, unit })}/>)}</View></>}
    <DateField label="Kullanmaya başladığın tarih" value={value.start} onChange={start => patch({ start })}/>
    {value.plan.kind !== 'daily' && <Toggle title="Değişim tarihini kendim seçeyim" value={value.manual} onChange={manual => patch({ manual })}/>}
    {value.manual && value.plan.kind !== 'daily' && <DateField label="Değişim tarihi" value={value.due} onChange={due => patch({ due })}/>}
    <Card><Copy size={12} muted>{value.plan.kind === 'daily' ? 'KULLANIM SONUNDA ATILACAK' : 'İLK DEĞİŞİM TARİHİN'}</Copy><Copy size={22} bold>{preview}</Copy></Card>
    <Copy size={12} muted>Lensinin kutusunda yazan veya göz uzmanının önerdiği süreyi esas al. Lens takmadığın günlerde takvim süresi durmaz.</Copy>
    {details && <><Field label="Marka (isteğe bağlı)" value={value.brand} onChange={brand => patch({ brand })}/><Field label="Lens numarası (isteğe bağlı)" value={value.power} onChange={power => patch({ power })}/></>}
  </>;
}
