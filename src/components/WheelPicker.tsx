import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { Copy, useColors } from './ui';

const ROW = 44;
const VISIBLE = 5;
/** The values are repeated so scrolling past the last one continues with the first (23 → 00, 59 → 00). */
const COPIES = 7;
const MIDDLE = Math.floor(COPIES / 2);
export const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * One vertical scrolling number column (hours or minutes). The value in the middle band is the selected one; when
 * scrolling stops it settles on the nearest row and the list quietly re-centres, so it can be scrolled endlessly in
 * both directions. The same component is used on the web and on Android. Screen readers get an adjustable control.
 */
export function WheelColumn({ label, count, value, onChange }: { label: string; count: number; value: number; onChange: (value: number) => void }) {
  const t = useColors();
  const ref = useRef<ScrollViewInstance | null>(null);
  const offset = useRef((MIDDLE * count + value) * ROW);
  const dragging = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const recentre = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [centre, setCentre] = useState(MIDDLE * count + value);
  // Timers outlive renders: read the latest value and callback through refs.
  const latest = useRef({ value, onChange }); latest.current = { value, onChange };
  const rows = useMemo(() => Array.from({ length: count * COPIES }, (_, i) => i), [count]);
  const valueAt = (index: number) => ((index % count) + count) % count;

  const scrollTo = (index: number, animated: boolean) => { offset.current = index * ROW; setCentre(index); ref.current?.scrollTo({ y: index * ROW, animated }); };
  // Shown value changed from outside (a quick-time chip, or the picker opening): move the column to it.
  useEffect(() => { if (valueAt(Math.round(offset.current / ROW)) !== value) scrollTo(MIDDLE * count + value, true); }, [value, count]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(recentre.current); }, []);

  const settle = () => {
    if (dragging.current) return;
    const index = Math.round(offset.current / ROW); const next = valueAt(index);
    if (Math.abs(offset.current - index * ROW) > 0.5) scrollTo(index, true);
    if (next !== latest.current.value) latest.current.onChange(next);
    // Back to the middle copy (same digits on screen), so there is always room to keep scrolling.
    const middle = MIDDLE * count + next;
    clearTimeout(recentre.current);
    if (index !== middle) recentre.current = setTimeout(() => scrollTo(middle, false), 260);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
    const index = Math.round(offset.current / ROW); if (index !== centre) setCentre(index);
    clearTimeout(timer.current); timer.current = setTimeout(settle, 140);
  };
  const step = (delta: number) => { const index = Math.round(offset.current / ROW) + delta; scrollTo(index, true); onChange(valueAt(index)); };

  return <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: pad2(value) }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={e => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    style={{ alignItems: 'center', gap: 6 }}>
    <Copy size={13} muted>{label}</Copy>
    <View style={{ width: 84, height: ROW * VISIBLE, overflow: 'hidden' }}>
      {/* Selection band behind the middle row. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ROW * 2, height: ROW, borderRadius: 12, backgroundColor: t.soft, borderWidth: 1.5, borderColor: '#9EC3EE' }}/>
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} nestedScrollEnabled snapToInterval={ROW} decelerationRate="fast" scrollEventThrottle={16}
        contentOffset={{ x: 0, y: offset.current }} onContentSizeChange={() => ref.current?.scrollTo({ y: offset.current, animated: false })}
        onScroll={onScroll} onScrollBeginDrag={() => { dragging.current = true; clearTimeout(recentre.current); }}
        onScrollEndDrag={() => { dragging.current = false; clearTimeout(timer.current); timer.current = setTimeout(settle, 140); }}
        onMomentumScrollEnd={() => { clearTimeout(timer.current); settle(); }}
        contentContainerStyle={{ paddingVertical: ROW * 2 }}>
        {rows.map(index => { const distance = Math.abs(index - centre); const selected = distance === 0;
          return <Pressable key={index} importantForAccessibility="no" accessibilityElementsHidden onPress={() => { scrollTo(index, true); onChange(valueAt(index)); }} style={{ height: ROW, alignItems: 'center', justifyContent: 'center' }}>
            <Copy bold={selected} size={selected ? 30 : 22} style={{ lineHeight: ROW - 4, fontVariant: ['tabular-nums'], color: selected ? t.accent : t.text, opacity: selected ? 1 : distance === 1 ? .55 : .25 }}>{pad2(valueAt(index))}</Copy>
          </Pressable>; })}
      </ScrollView>
    </View>
  </View>;
}
