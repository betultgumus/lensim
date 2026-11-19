import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp, showError } from '../state/AppContext';
import { useTheme } from '../design/theme';
import { PressScale } from './PressScale';
export function useColors() { return useTheme(useApp().state.settings); }
export function Copy({ children, size = 17, muted = false, bold = false, mono = false, style, numberOfLines, fit = false }: React.PropsWithChildren<{ size?: number; muted?: boolean; bold?: boolean; mono?: boolean; style?: StyleProp<import('react-native').TextStyle>; numberOfLines?: number; fit?: boolean }>) {
  const t = useColors(); return <Text numberOfLines={numberOfLines} adjustsFontSizeToFit={fit} minimumFontScale={fit ? .75 : undefined} style={[{ color: muted ? t.muted : t.text, fontSize: size, fontWeight: bold ? '700' : '400', fontFamily:mono?(bold?'IBMPlexMono_600SemiBold':'IBMPlexMono_400Regular'):(bold?'Archivo_700Bold':'Archivo_400Regular'), lineHeight: size * 1.4 }, style]}>{children}</Text>;
}
/** `background` renders behind the scrolling content; `dense` narrows the side gutter to 16 and tightens the top padding and item gap so more fits above the fold. */
export function Screen({ children, title, subtitle, back = false, background, dense = false, scrollRef, onViewportLayout }: React.PropsWithChildren<{ title?: string; subtitle?: string; back?: boolean; background?: React.ReactNode; dense?: boolean; scrollRef?: React.RefObject<import('react-native').ScrollViewInstance | null>; onViewportLayout?: (e: import('react-native').LayoutChangeEvent) => void }>) {
  const t = useColors();
  return <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top','left','right']}>
    {background}
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} onLayout={onViewportLayout} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.screen, dense && { paddingHorizontal: 16, paddingTop: 10, gap: 10 }]}>
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
    {pages > 1 && <><Copy muted size={14}>Sayfa {current + 1} / {pages} · {items.length} kayıt</Copy><View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Button title="Önceki" secondary disabled={current === 0} onPress={() => setPage(current - 1)}/></View><View style={{ flex: 1 }}><Button title="Sonraki" secondary disabled={current === pages - 1} onPress={() => setPage(current + 1)}/></View></View></>}
  </View>;
}
/** `outlined` adds a visible frame to a secondary button (used for the main secondary action on a screen). */
export function Button({ title, onPress, secondary = false, danger = false, disabled = false, icon, outlined = false }: { title: string; onPress: () => void | Promise<unknown>; secondary?: boolean; danger?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap; outlined?: boolean }) {
  const t = useColors(); const [busy, setBusy] = useState(false); const inFlight = useRef(false);
  const color = secondary ? (danger ? t.danger : t.accent) : '#FFFFFF';
  const click = async () => { if (inFlight.current || disabled) return; inFlight.current = true; setBusy(true); try { await onPress(); } catch (e) { showError(e); } finally { inFlight.current = false; setBusy(false); } };
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={click} style={({ pressed }) => [styles.button, { backgroundColor: secondary ? t.soft : danger ? t.danger : (t.dark ? '#7354B6' : t.accent), opacity: disabled ? .4 : pressed ? .75 : 1 }, outlined && { borderWidth: 1.5, borderColor: danger ? t.danger : '#6FA3E6', backgroundColor: '#F4F9FF' }]}>
    {busy ? <ActivityIndicator color={color}/> : icon ? <Ionicons name={icon} size={20} color={color}/> : null}<Text style={{ color, fontSize: 17, fontWeight: '700', fontFamily:'Archivo_700Bold', textAlign: 'center' }}>{title}</Text>
  </Pressable>;
}
/**
 * `numeric` is for whole counts; `signed` is for values such as -2.50 or +1.25 (number-pad has no minus or decimal key).
 * `hint` is a lighter secondary note after the label (e.g. a format); `tag` sits at the right end of the label row
 * ("Zorunlu" / "İsteğe bağlı"); `error` is shown right under the input; `trailing` is drawn inside the input on the right.
 */
export function Field({ label, value, onChange, placeholder, numeric, signed, multiline, labelAccessory, hint, tag, error, trailing, onBlur, compact = false, hideLabel = false }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string; numeric?: boolean; signed?: boolean; multiline?: boolean; labelAccessory?: React.ReactNode; hint?: string; tag?: { text: string; required?: boolean }; error?: string | null; trailing?: React.ReactNode; onBlur?: () => void; compact?: boolean; hideLabel?: boolean }) {
  const t = useColors();
  return <View style={{ gap: compact ? 4 : 7 }}>
    {!hideLabel && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ flexShrink: 1, fontFamily: 'Archivo_700Bold', fontSize: 14, lineHeight: 20, color: t.text }}>{label}{hint ? <Text style={{ fontFamily: 'Archivo_400Regular', color: '#8191A8' }}>{`  ${hint}`}</Text> : null}</Text>
      {labelAccessory}
      {/* "Zorunlu" stands out; "İsteğe bağlı" is a quiet secondary note. */}
      {tag && <View style={{ marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999, backgroundColor: tag.required ? '#FFF1DC' : '#F3F6FA' }}><Text style={{ fontFamily: tag.required ? 'Archivo_700Bold' : 'Archivo_400Regular', fontSize: 12, lineHeight: 16, color: tag.required ? '#8A4B00' : '#8191A8' }}>{tag.text}</Text></View>}
    </View>}
    <View style={{ justifyContent: 'center' }}>
      <TextInput accessibilityLabel={tag?.required ? `${label}, zorunlu` : label} accessibilityHint={error ?? undefined} value={value} onChangeText={onChange} onBlur={onBlur} placeholder={placeholder} placeholderTextColor="#8193AD" keyboardType={signed ? (Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default') : numeric ? 'number-pad' : 'default'} autoCapitalize="none" multiline={multiline} style={[styles.field, { backgroundColor: t.surface, color: t.text, borderColor: error ? t.danger : t.border, borderWidth: error ? 1.5 : 1, fontFamily: 'Archivo_400Regular', minHeight: multiline ? 100 : compact ? 46 : 52 }, compact && { paddingHorizontal: 10, paddingVertical: 9, fontSize: 16, textAlign: 'center' }, trailing ? { paddingRight: 52 } : null]}/>
      {trailing && <View style={{ position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center' }}>{trailing}</View>}
    </View>
    {!!error && <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="alert-circle" size={16} color={t.danger}/><Text style={{ flex: 1, fontFamily: 'Archivo_400Regular', fontSize: 14, lineHeight: 19, color: t.danger }}>{error}</Text></View>}
  </View>;
}
export function Toggle({ title, description, value, onChange }: { title: string; description?: string; value: boolean; onChange: (v: boolean) => void | Promise<unknown> }) {
  const t = useColors(); return <View style={styles.row}><View style={{ flex: 1, gap: 4 }}><Copy bold>{title}</Copy>{description && <Copy size={14} muted>{description}</Copy>}</View><Switch accessibilityLabel={title} value={value} trackColor={{ false: t.border, true: t.accent }} onValueChange={async v => { try { await onChange(v); } catch (e) { showError(e); } }}/></View>;
}
export function Row({ title, detail, icon, onPress }: { title: string; detail?: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const t = useColors(); return <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>{icon && <View style={[styles.icon, { backgroundColor: t.soft }]}><Ionicons name={icon} size={21} color={t.accent}/></View>}<View style={{ flex: 1 }}><Copy bold>{title}</Copy>{detail && <Copy muted size={14}>{detail}</Copy>}</View><Ionicons name="chevron-forward" color={t.muted} size={18}/></Pressable>;
}
export function Chip({ title, selected = false, onPress }: { title: string; selected?: boolean; onPress: () => void | Promise<unknown> }) {
  const t = useColors(); return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => Promise.resolve().then(onPress).catch(e => showError(e))} style={{ paddingHorizontal: 16, paddingVertical: 12, minHeight: 48, borderRadius: 999, borderWidth: selected ? 2 : 1, borderColor: selected ? t.accent : t.border, backgroundColor: selected ? t.soft : t.surface, justifyContent: 'center' }}><Copy size={14} bold={selected} style={selected ? { color: t.accent } : undefined}>{title}</Copy></Pressable>;
}
/** Pill switch. The selected option is filled and bold; every press gets a short scale response (skipped with reduce motion). */
/** `compact` fits four short options on one row even on narrow phones (smaller text that shrinks to fit). */
export function SegmentedControl({label,options,selected,onChange,compact=false}:{label:string;options:Array<{value:string;title:string;icon?:keyof typeof Ionicons.glyphMap;selectedColor?:string;selectedTextColor?:string}>;selected:string;onChange:(value:string)=>void;compact?:boolean}){
 const t=useColors();return <View accessibilityLabel={label} style={{flexDirection:'row',gap:4,padding:4,borderRadius:999,borderWidth:1,borderColor:t.border,backgroundColor:t.soft}}>{options.map(option=>{const active=selected===option.value;const color=active?(option.selectedColor??t.accent):'transparent';const textColor=active?(option.selectedTextColor??'#FFFFFF'):t.text;return <PressScale key={option.value} popOn={active} accessibilityRole="button" accessibilityLabel={option.title} accessibilityState={{selected:active}} onPress={()=>onChange(option.value)} style={{flex:1,minWidth:0,minHeight:44,paddingHorizontal:compact?4:9,paddingVertical:8,borderRadius:999,backgroundColor:color,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6,...(active?{shadowColor:'#10265A',shadowOpacity:.18,shadowRadius:4,shadowOffset:{width:0,height:1},elevation:2}:null)}}>{option.icon&&<Ionicons name={option.icon} size={17} color={textColor}/>}<Copy size={compact?14:15} bold={active} numberOfLines={1} fit style={{color:textColor,textAlign:'center'}}>{option.title}</Copy></PressScale>})}</View>;
}
/** One option of a single-choice list: radio mark, title, optional detail lines. `variant="add"` is the dashed "create new" entry. */
export function ChoiceCard({ title, detail, meta, selected, onPress, variant = 'option', icon }: { title: string; detail?: string; meta?: string; selected: boolean; onPress: () => void; variant?: 'option' | 'add'; icon?: keyof typeof Ionicons.glyphMap }) {
  const t = useColors(); const add = variant === 'add';
  return <PressScale pressedScale={0.98} accessibilityRole="radio" accessibilityState={{ checked: selected, selected }} accessibilityLabel={[title, detail, meta].filter(Boolean).join(', ')} onPress={onPress}
    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, minHeight: 56, borderRadius: 18, borderWidth: selected ? 2 : 1, borderStyle: add && !selected ? 'dashed' : 'solid', borderColor: selected ? t.accent : add ? '#9DB8DA' : t.border, backgroundColor: selected ? '#F1F7FF' : t.surface }}>
    {add ? <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? t.accent : t.soft, marginTop: 1 }}><Ionicons name={icon ?? 'add'} size={17} color={selected ? '#FFFFFF' : t.accent}/></View>
      : <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? t.accent : '#8EA6C6', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>{selected && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: t.accent }}/>}</View>}
    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
      <Copy bold size={16} style={{ color: selected || add ? t.accent : t.text }}>{title}</Copy>
      {!!detail && <Copy size={14} style={{ color: '#3A5079' }}>{detail}</Copy>}
      {!!meta && <Copy size={13} muted>{meta}</Copy>}
    </View>
    {selected && !add && <Ionicons name="checkmark-circle" size={20} color={t.accent}/>}
  </PressScale>;
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
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 16 },
  button: { minHeight: 56, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  field: { borderRadius: 14, borderWidth: 1, padding: 13, fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
