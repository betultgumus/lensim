import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp, errorText } from '../state/AppContext';
import { useTheme } from '../design/theme';
export function useColors() { return useTheme(useApp().state.settings); }
export function Copy({ children, size = 15, muted = false, bold = false, style }: React.PropsWithChildren<{ size?: number; muted?: boolean; bold?: boolean; style?: StyleProp<import('react-native').TextStyle> }>) {
  const t = useColors(); return <Text style={[{ color: muted ? t.muted : t.text, fontSize: size, fontWeight: bold ? '700' : '400', lineHeight: size * 1.45 }, style]}>{children}</Text>;
}
export function Screen({ children, title, subtitle, back = false }: React.PropsWithChildren<{ title?: string; subtitle?: string; back?: boolean }>) {
  const t = useColors();
  return <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top','left','right']}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen}>
        {back && <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}><Ionicons name="arrow-back" size={23} color={t.text}/><Copy>Geri</Copy></Pressable>}
        {title && <View style={{ marginBottom: 8 }}><Copy size={30} bold>{title}</Copy>{subtitle && <Copy muted style={{ marginTop: 6 }}>{subtitle}</Copy>}</View>}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Card({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) { const t = useColors(); return <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, style]}>{children}</View>; }
/** Bounded pages share the screen scroll; no nested virtualized list. */
export function PagedList<T extends { id: string }>({ items, renderItem }: { items: T[]; renderItem: (item: T) => React.ReactNode }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / 20));
  const current = Math.min(page, pages - 1);
  return <View style={{ gap: 12 }}>
    {items.slice(current * 20, (current + 1) * 20).map(item => <React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>)}
    {pages > 1 && <><Copy muted size={12}>Sayfa {current + 1} / {pages} · {items.length} kayıt</Copy><View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Button title="Önceki" secondary disabled={current === 0} onPress={() => setPage(current - 1)}/></View><View style={{ flex: 1 }}><Button title="Sonraki" secondary disabled={current === pages - 1} onPress={() => setPage(current + 1)}/></View></View></>}
  </View>;
}
export function Button({ title, onPress, secondary = false, danger = false, disabled = false, icon }: { title: string; onPress: () => void | Promise<unknown>; secondary?: boolean; danger?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const t = useColors(); const [busy, setBusy] = useState(false); const inFlight = useRef(false);
  const color = secondary ? (danger ? t.danger : t.accent) : '#FFFFFF';
  const click = async () => { if (inFlight.current || disabled) return; inFlight.current = true; setBusy(true); try { await onPress(); } catch (e) { Alert.alert('İşlem tamamlanamadı', errorText(e)); } finally { inFlight.current = false; setBusy(false); } };
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={click} style={({ pressed }) => [styles.button, { backgroundColor: secondary ? t.soft : danger ? t.danger : (t.dark ? '#7354B6' : t.accent), opacity: disabled ? .4 : pressed ? .75 : 1 }]}>
    {busy ? <ActivityIndicator color={color}/> : icon ? <Ionicons name={icon} size={20} color={color}/> : null}<Text style={{ color, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
  </Pressable>;
}
export function Field({ label, value, onChange, placeholder, numeric, multiline }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string; numeric?: boolean; multiline?: boolean }) {
  const t = useColors(); return <View style={{ gap: 7 }}><Copy size={13} bold>{label}</Copy><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={t.muted} keyboardType={numeric ? 'number-pad' : 'default'} autoCapitalize="none" multiline={multiline} style={[styles.field, { backgroundColor: t.surface, color: t.text, borderColor: t.border, minHeight: multiline ? 100 : 52 }]}/></View>;
}
export function Toggle({ title, description, value, onChange }: { title: string; description?: string; value: boolean; onChange: (v: boolean) => void | Promise<unknown> }) {
  const t = useColors(); return <View style={styles.row}><View style={{ flex: 1, gap: 4 }}><Copy bold>{title}</Copy>{description && <Copy size={12} muted>{description}</Copy>}</View><Switch accessibilityLabel={title} value={value} trackColor={{ false: t.border, true: t.accent }} onValueChange={async v => { try { await onChange(v); } catch (e) { Alert.alert('Kaydedilemedi', errorText(e)); } }}/></View>;
}
export function Row({ title, detail, icon, onPress }: { title: string; detail?: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const t = useColors(); return <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>{icon && <View style={[styles.icon, { backgroundColor: t.soft }]}><Ionicons name={icon} size={21} color={t.accent}/></View>}<View style={{ flex: 1 }}><Copy bold>{title}</Copy>{detail && <Copy muted size={12}>{detail}</Copy>}</View><Ionicons name="chevron-forward" color={t.muted} size={18}/></Pressable>;
}
export function Chip({ title, selected = false, onPress }: { title: string; selected?: boolean; onPress: () => void | Promise<unknown> }) {
  const t = useColors(); return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => Promise.resolve().then(onPress).catch(e => Alert.alert('Kaydedilemedi', errorText(e)))} style={{ paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: selected ? t.accent : t.border, backgroundColor: selected ? t.soft : t.surface }}><Copy size={13} bold={selected} style={selected ? { color: t.accent } : undefined}>{title}</Copy></Pressable>;
}
export function Sheet({ visible, title, children, onClose }: React.PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  const t = useColors(); return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#16102077' }}>
      <Pressable accessibilityLabel="Pencereyi kapat" onPress={onClose} style={StyleSheet.absoluteFill}/>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: t.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%' }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 18 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.border }}/>
          <View style={styles.row}><View style={{ flex: 1 }}><Copy size={23} bold>{title}</Copy></View><Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} style={styles.icon}><Ionicons name="close" size={24} color={t.text}/></Pressable></View>
          {children}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}
export const styles = StyleSheet.create({
  screen: { padding: 24, paddingBottom: 40, gap: 20, width: '100%', maxWidth: 640, alignSelf: 'center', flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 24, padding: 20, gap: 16 },
  button: { minHeight: 56, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  field: { borderRadius: 15, borderWidth: 1, padding: 15, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
