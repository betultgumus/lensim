import React, { useState } from 'react';
import { View } from 'react-native';
import { Chip, Copy, Field, SegmentedControl } from './ui';
import { DURATION_OPTIONS } from '../domain/dates';
import { RX_RULES, rxError, rxHint, sanitizeRx } from '../domain/rx';
import type { Eye, LensBox } from '../domain/types';

export type LensType = LensBox['lensType'];
export const typeNames: Record<LensType, string> = { spherical: 'Küresel', toric: 'Torik', multifocal: 'Multifokal', colored: 'Renkli' };
/** Number fields per lens type. Renk (colour) is text and gets its own full-width field. */
export const numberKeys = (type: LensType) => type === 'spherical' ? ['PWR', 'BC', 'DIA'] : type === 'toric' ? ['SPH', 'CYL', 'AXIS', 'BC', 'DIA'] : type === 'multifocal' ? ['SPH', 'ADD', 'BC', 'DIA'] : ['PWR', 'BC', 'DIA'];
/** Short Turkish names shown under the code, so three fields fit side by side on small phones. */
const shortNames: Record<string, string> = { PWR: 'Lens gücü', SPH: 'Numara', CYL: 'Astigmat', AXIS: 'Eksen', ADD: 'Yakın ek', BC: 'Lens eğrisi', DIA: 'Lens çapı' };

/** Usage period as one pill row: Günlük · 15 günlük · Aylık · Özel (same look as the eye selector). */
export function DurationPicker({ days, custom, onChange, allowDaily = true }: { days: string; custom: boolean; onChange: (days: string, custom: boolean) => void; allowDaily?: boolean }) {
  const presets = DURATION_OPTIONS.filter(([n]) => allowDaily || n > 1);
  const selected = custom ? 'custom' : presets.some(([n]) => String(n) === days) ? days : 'custom';
  return <View style={{ gap: 10 }}>
    <SegmentedControl compact label="Kullanım süresi" selected={selected} onChange={value => value === 'custom' ? onChange(presets.some(([n]) => String(n) === days) ? '' : days, true) : onChange(value, false)} options={[...presets.map(([n, title]) => ({ value: String(n), title })), { value: 'custom', title: 'Özel' }]}/>
    {selected === 'custom' && <Field label="Özel kullanım süresi" hint="gün" numeric value={days} onChange={value => onChange(value, true)} placeholder="Örn. 7"/>}
  </View>;
}

/** Lens type as rounded pills; a separate group from the number fields. */
export function LensTypePicker({ type, onChange }: { type: LensType; onChange: (type: LensType) => void }) {
  return <View accessibilityLabel="Lens türü" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {(Object.keys(typeNames) as LensType[]).map(value => <Chip key={value} title={typeNames[value]} selected={type === value} onPress={() => onChange(value)}/>)}
  </View>;
}

/** One compact cell: code on top (PWR), its short name below, the input right under them. Three fit on a row. */
export function NumberCell({ code, value, onChange }: { code: string; value: string; onChange: (v: string) => void }) {
  return <View style={{ flexGrow: 1, flexBasis: '30%', minWidth: 82, gap: 4 }}>
    <View style={{ alignItems: 'center' }}>
      <Copy bold size={14} style={{ lineHeight: 18 }}>{code}</Copy>
      <Copy size={12} numberOfLines={1} fit style={{ color: '#556B8C', lineHeight: 16 }}>{shortNames[code] ?? code}</Copy>
    </View>
    <RxField compact code={code} label={`${shortNames[code] ?? code} (${code})`} value={value} onChange={onChange} placeholder="—" hideLabel/>
  </View>;
}

/**
 * Prescription number input. Letters and other characters are dropped while typing or pasting (with a short note
 * saying why), and a value outside the field's range is pointed out right away; saving checks again (assertRxValues).
 */
export function RxField({ code, value, onChange, ...field }: { code: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; compact?: boolean; hideLabel?: boolean }) {
  const [dropped, setDropped] = useState(false);
  const change = (raw: string) => { const { value: next, removed } = sanitizeRx(code, raw); setDropped(removed); onChange(next); };
  const problem = rxError(code, value) ?? (dropped ? `Yalnızca sayı yazılabilir. ${rxHint(code)}` : null);
  // Whole numbers (AXIS) get the digit pad; values with a sign or decimals need the keyboard that has them.
  const whole = RX_RULES[code] ? !RX_RULES[code]!.decimals && !RX_RULES[code]!.signed : false;
  return <Field {...field} signed={!whole} numeric={whole} value={value} onChange={change} onBlur={() => setDropped(false)} error={problem}/>;
}

/** Number values in rows of up to three. Two eyes with different numbers get one titled group per eye. */
export function NumberGrid({ type, eyes, separate, values, onChange }: { type: LensType; eyes: Eye[]; separate: boolean; values: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const keys = numberKeys(type);
  const group = (prefix: string, title?: string) => <View key={prefix || 'shared'} style={{ gap: 6 }}>
    {title && <Copy bold size={14} style={{ color: '#2C4A78' }}>{title}</Copy>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{keys.map(code => <NumberCell key={code} code={code} value={values[`${prefix}${code}`] ?? ''} onChange={v => onChange(`${prefix}${code}`, v)}/>)}</View>
  </View>;
  return <View style={{ gap: 12 }}>
    {type === 'colored' && <Field label="Renk" value={values.Renk ?? ''} onChange={v => onChange('Renk', v)} placeholder="Örn. bal rengi"/>}
    {eyes.length === 2 && separate ? <>{group('right-', 'Sağ göz')}{group('left-', 'Sol göz')}</> : group('', eyes.length === 1 ? (eyes[0] === 'right' ? 'Sağ göz' : 'Sol göz') : undefined)}
  </View>;
}
