import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Chip, Copy, Field } from './ui';
import { normalizeTimeInput } from '../domain/dates';

/**
 * Reminder time: a few common times as pills plus a typed SS:DD field for any other time.
 * Reports the valid time (or null while the typed value is not a real time).
 */
export function TimePicker({ label, value, presets, onChange }: { label: string; value: string; presets: string[]; onChange: (time: string | null) => void }) {
  const [text, setText] = useState(value); const [error, setError] = useState<string | null>(null);
  useEffect(() => { setText(value); }, [value]);
  const type = (raw: string) => {
    setText(raw); const next = normalizeTimeInput(raw);
    if (next) { setError(null); onChange(next); } else { onChange(null); setError(raw.replace(/\D/g, '').length >= 3 ? 'Bu saat anlaşılmadı. SS:DD biçiminde gir (ör. 21:00 veya 08:30).' : null); }
  };
  return <View style={{ gap: 8 }}>
    <View accessibilityLabel={`${label}: hazır saatler`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {presets.map(time => <Chip key={time} title={time} selected={value === time && text === time} onPress={() => { setText(time); setError(null); onChange(time); }}/>)}
    </View>
    <Field label={label} hint="SS:DD · başka bir saat yazabilirsin" value={text} onChange={type} placeholder="21:00" numeric error={error}/>
    {!error && normalizeTimeInput(text) && <Copy size={13} muted>Bildirim her gün saat {normalizeTimeInput(text)}’de gelir.</Copy>}
  </View>;
}
