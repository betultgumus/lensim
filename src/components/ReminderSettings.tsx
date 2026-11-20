import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Pressable, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useIsFocused } from 'expo-router';
import { Button, Card, Chip, Copy, Sheet, styles, switchColors, switchThumb, useColors } from './ui';
import { useApp, showError } from '../state/AppContext';
import { WheelColumn, pad2 } from './WheelPicker';
import { exactAlarmAccess, notificationAccess, openNotificationSettings, requestExactAlarms, requestNotifications, type NotificationAccess } from '../services/notifications';
import type { Settings } from '../domain/types';

type ReminderKey = 'notifications' | 'nightReminder';
/** `exact`: Android "Alarmlar ve hatırlatıcılar" access (always true elsewhere); null while checking. */
export type NotificationState = { access: NotificationAccess | null; exact: boolean | null; refresh: () => Promise<void> };

/** Phone notification permission, checked again when the screen is shown again and when the app comes back (e.g. from the system settings). */
export function useNotificationAccess(): NotificationState {
  const [access, setAccess] = useState<NotificationAccess | null>(null); const [exact, setExact] = useState<boolean | null>(null);
  const refresh = useCallback(async () => { const [a, e] = await Promise.all([notificationAccess().catch(() => 'denied' as const), exactAlarmAccess().catch(() => true)]); setAccess(a); setExact(e); }, []);
  const focused = useIsFocused();
  useEffect(() => { if (focused) void refresh(); }, [focused, refresh]);
  useEffect(() => { const sub = AppState.addEventListener('change', st => { if (st === 'active') void refresh(); }); return () => sub.remove(); }, [refresh]);
  return { access, exact, refresh };
}

/** Asks the OS for permission only after saying which reminder will come at what time. */
function explainThenRequest(title: string, message: string): Promise<boolean> {
  return new Promise(resolve => Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
    { text: 'İzin ver', onPress: () => { requestNotifications().then(resolve, () => resolve(false)); } },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

/**
 * Turns ONE reminder on or off. Turning on checks the phone permission first: it is asked (after saying what will
 * come when) if it can be, or the system settings are offered if it was blocked. The web preview only saves the choice.
 */
function useReminderToggle({ refresh }: NotificationState) {
  const { dispatch } = useApp();
  return async (key: ReminderKey, enabled: boolean, explain: string) => {
    if (enabled) {
      const access = await notificationAccess().catch(() => 'denied' as const);
      if (access === 'blocked') {
        Alert.alert('Bildirim izni kapalı', `${explain}\n\nTelefon ayarlarında Lensim bildirimlerine izin verdikten sonra hatırlatmayı aç.`, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Ayarları aç', onPress: () => { void openNotificationSettings(); } }]);
        return;
      }
      if (access === 'denied') {
        const ok = await explainThenRequest('Bildirim izni gerekiyor', `${explain}\n\nBunun için telefonun Lensim’e bildirim izni vermesi gerekiyor. Diğer hatırlatman bundan etkilenmez.`);
        await refresh();
        if (!ok) { Alert.alert('Hatırlatma açılmadı', 'Bildirim izni verilmedi. Takip çalışmaya devam eder; istersen sistem ayarlarından izni açıp tekrar deneyebilirsin.'); return; }
      }
    }
    await dispatch({ type: 'settings', patch: { [key]: enabled } as Partial<Settings> });
    if (enabled && !(await exactAlarmAccess().catch(() => true))) offerExactAlarms(refresh);
  };
}
const EXACT_MESSAGE = 'Telefonun “Alarmlar ve hatırlatıcılar” izni kapalı. Bu izin olmadan Android hatırlatmaları geciktirebilir, pil tasarrufunda hiç göstermeyebilir.';
/** Offers the system screen for exact alarms; the reminders are scheduled again when the app comes back. */
function offerExactAlarms(refresh: () => Promise<void>) {
  Alert.alert('Hatırlatmalar tam saatinde gelsin', EXACT_MESSAGE, [{ text: 'Şimdi değil', style: 'cancel' }, { text: 'İzin ver', onPress: () => { requestExactAlarms().finally(() => { void refresh(); }); } }]);
}
const explainFor = (key: ReminderKey, s: Settings) => key === 'notifications' ? `Her gün saat ${s.notificationTime}’de “Bugün lens taktın mı?” bildirimi gönderilecek.` : `Her gece saat ${s.nightReminderTime}’te “Lenslerini çıkardın mı?” bildirimi gönderilecek.`;

/** The two reminders: each has its own on/off setting and its own time setting, never shared. */
const REMINDERS = {
  notifications: { timeKey: 'notificationTime', label: 'Günlük soru saati', presets: ['08:00', '12:00', '18:00', '20:00', '21:00', '22:00'] },
  nightReminder: { timeKey: 'nightReminderTime', label: 'Gece hatırlatma saati', presets: ['21:30', '22:00', '22:30', '23:00', '23:30', '00:00'] },
} as const;

/**
 * Time picker window for ONE reminder: scrolling hour and minute columns plus common times. Drawn by the app itself, so it is
 * the same in the web preview and on Android. Nothing is saved until "Saati kaydet"; only this reminder's time changes.
 */
function TimeSheet(props: { reminder: ReminderKey | null; value: string; onSave: (time: string) => Promise<unknown>; onClose: () => void }) {
  // Mounted fresh on every opening, so the columns start on the saved time.
  return props.reminder ? <TimeSheetBody {...props} reminder={props.reminder}/> : null;
}
function TimeSheetBody({ reminder, value, onSave, onClose }: { reminder: ReminderKey; value: string; onSave: (time: string) => Promise<unknown>; onClose: () => void }) {
  const t = useColors(); const [h0, m0] = value.split(':').map(Number);
  const [hour, setHour] = useState(h0 ?? 0); const [minute, setMinute] = useState(m0 ?? 0);
  const def = REMINDERS[reminder]; const time = `${pad2(hour)}:${pad2(minute)}`;
  return <Sheet visible title={def.label} onClose={onClose}>
    {/* Two scrolling columns; the value in the highlighted middle row is the chosen one. */}
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
      <WheelColumn label="Saat" count={24} value={hour} onChange={setHour}/>
      <Copy bold size={34} style={{ lineHeight: 40, marginTop: 24 }}>:</Copy>
      <WheelColumn label="Dakika" count={60} value={minute} onChange={setMinute}/>
    </View>
    <View accessibilityLabel={`${def.label}: hazır saatler`} style={[styles.wrap, { justifyContent: 'center' }]}>{def.presets.map(p => <Chip key={p} title={p} selected={time === p} onPress={() => { const [h, m] = p.split(':').map(Number); setHour(h!); setMinute(m!); }}/>)}</View>
    <Button title={`Saati kaydet · ${time}`} icon="checkmark" onPress={async () => { await onSave(time); onClose(); }}/>
    <Pressable accessibilityRole="button" onPress={onClose} style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}><Copy bold size={15} style={{ color: t.accent }}>Vazgeç</Copy></Pressable>
  </Sheet>;
}
/** Which reminder's time picker is open, and saving its time (only that reminder's time setting). */
function useTimeSheet() {
  const { state, dispatch } = useApp(); const [editing, setEditing] = useState<ReminderKey | null>(null);
  const sheet = <TimeSheet reminder={editing} value={editing ? state.settings[REMINDERS[editing].timeKey] : '00:00'} onClose={() => setEditing(null)}
    onSave={time => editing ? dispatch({ type: 'settings', patch: { [REMINDERS[editing].timeKey]: time } as Partial<Settings> }) : Promise.resolve()}/>;
  return { open: setEditing, sheet };
}
/** Times and warning days of both reminders. Turning them on and off is done with the switches in ReminderSummary. */
export function ReminderCards() {
  const { state, dispatch } = useApp(); const s = state.settings;
  return <Card style={{ gap: 12, backgroundColor: '#FFFFFF', borderColor: '#D6E5F6', borderWidth: 1 }}>
      {/* The daily question's time and edit action are already in "Kurulu hatırlatmalar" above. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="calendar-outline" size={19} color="#0754C8"/><Copy bold size={16} style={{ flex: 1, color: '#10265A' }}>Paket değişim uyarısı</Copy></View>
      <View style={{ flexDirection: 'row', gap: 6 }}>{[3, 1, 0].map(offset => {const selected=s.offsets.includes(offset);return <Pressable key={offset} accessibilityRole="button" accessibilityLabel={offset === 0 ? 'Değişim günü' : `${offset} gün kala`} accessibilityState={{selected}} onPress={() => dispatch({ type: 'settings', patch: { offsets: selected ? s.offsets.filter(n => n !== offset) : [...s.offsets, offset] } })} style={{flex:1,minWidth:0,minHeight:48,paddingHorizontal:6,paddingVertical:10,borderRadius:999,borderWidth:1.5,borderColor:selected?'#0754C8':'#D6E5F6',backgroundColor:selected?'#E8F2FF':'#FFFFFF',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4}}>{selected&&<Ionicons name="checkmark-circle" size={15} color="#0754C8"/>}<Copy size={12.5} bold={selected} numberOfLines={1} fit style={{color:selected?'#0754C8':'#10265A',textAlign:'center',flexShrink:1}}>{offset === 0 ? 'Değişim günü' : `${offset} gün kala`}</Copy></Pressable>})}</View>
      <Copy size={13} style={{ color: '#5B6B80', lineHeight: 18 }}>Günlük soruyla aynı saatte gelir; günlük lenslerde gönderilmez.</Copy>
    </Card>;
}

/** Next time a daily HH:MM reminder fires, as "Bugün 21:00" / "Yarın 21:00". */
function nextFire(time: string, now = new Date()) {
  const [h, m] = time.split(':').map(Number); const at = new Date(now); at.setHours(h!, m!, 0, 0);
  return `${at > now ? 'Bugün' : 'Yarın'} ${time}`;
}
function SummaryRow({ icon, title, time, on, permissionOff, onToggle, onEditTime, last = false }: { icon: 'sunny-outline' | 'moon-outline'; title: string; time: string; on: boolean; permissionOff: boolean; onToggle: (enabled: boolean) => Promise<unknown>; onEditTime: () => void; last?: boolean }) {
  const t = useColors(); const live = on && !permissionOff;
  // Says exactly what is off: this reminder, or (while it is on) the phone permission.
  const status = !on ? 'Bu hatırlatma kapalı' : permissionOff ? 'Telefon bildirim izni kapalı · gelmez' : `Sonraki: ${nextFire(time)}`;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderColor: t.border }}>
    {/* Row and time open the time picker; the switch beside them only turns the reminder on or off. */}
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}, saat ${time}. Saati değiştir`} accessibilityHint={status} onPress={onEditTime} style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? .7 : 1 })}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: live ? '#E8F2FF' : on ? '#FFF1DC' : '#EEF1F5', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={21} color={live ? t.accent : on ? '#8A4B00' : '#6B7A90'}/></View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Copy bold size={15} style={{ lineHeight: 20 }}>{title}</Copy>
        <Copy size={13} style={{ lineHeight: 18, color: live ? '#2C4A78' : on ? '#8A4B00' : '#5B6B80' }}>{status}</Copy>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Copy bold size={19} style={{ lineHeight: 24, color: live ? t.text : '#5B6B80', fontVariant: ['tabular-nums'] }}>{time}</Copy>
        <Ionicons name="create-outline" size={14} color={live ? t.accent : '#8A98AC'}/>
      </View>
    </Pressable>
    <Switch accessibilityLabel={`${title} hatırlatması`} accessibilityHint={status} value={on} {...switchColors} thumbColor={switchThumb(on)} onValueChange={v => { onToggle(v).catch(e => showError(e)); }}/>
  </View>;
}
/**
 * "Kurulu hatırlatmalar": both reminders with an on/off switch and their time. Shown first on the Hatırlatmalar
 * screen and in Ayarlar; with `onEdit` a "Düzenle" link opens the reminder settings (times, warning days).
 */
export function ReminderSummary({ notifications, onEdit }: { notifications: NotificationState; onEdit?: () => void }) {
  const { state } = useApp(); const t = useColors(); const s = state.settings; const toggle = useReminderToggle(notifications); const times = useTimeSheet();
  const permissionOff = notifications.access === 'denied' || notifications.access === 'blocked';
  return <View style={{ borderWidth: 1.5, borderColor: '#9EC3EE', borderRadius: 18, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, gap: 4, shadowColor: '#7AADE8', shadowOpacity: .16, shadowRadius: 10, elevation: 3 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name="notifications" size={18} color={t.accent}/>
      <Copy bold size={16} style={{ flex: 1, lineHeight: 21 }}>Kurulu hatırlatmalar</Copy>
      {onEdit && <Pressable accessibilityRole="button" accessibilityLabel="Hatırlatma saatlerini düzenle" hitSlop={8} onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 36 }}><Copy bold size={14} style={{ color: t.accent }}>Düzenle</Copy><Ionicons name="chevron-forward" size={16} color={t.accent}/></Pressable>}
    </View>
    <View>
      <SummaryRow icon="sunny-outline" title="“Bugün lens taktın mı?”" time={s.notificationTime} on={s.notifications} permissionOff={permissionOff} onToggle={v => toggle('notifications', v, explainFor('notifications', s))} onEditTime={() => times.open('notifications')}/>
      <SummaryRow icon="moon-outline" title="“Lenslerini çıkardın mı?”" time={s.nightReminderTime} on={s.nightReminder} permissionOff={permissionOff} onToggle={v => toggle('nightReminder', v, explainFor('nightReminder', s))} onEditTime={() => times.open('nightReminder')} last/>
    </View>
    {times.sheet}
  </View>;
}

/**
 * Shown only while reminders cannot arrive: the phone permission is off, both reminders are off, or (Android 12+)
 * exact alarms are not allowed so reminders may come late or never. Its button leads to what fixes it.
 * `permissionOnly` (on the Hatırlatmalar screen itself) skips the "all reminders off" case, whose fix is that screen.
 */
export function NotificationsPrompt({ notifications, permissionOnly = false }: { notifications: NotificationState; permissionOnly?: boolean }) {
  const { state } = useApp(); const s = state.settings; const { access, exact, refresh } = notifications;
  if (access === null) return null;
  const anyOn = s.notifications || s.nightReminder;
  const permissionOff = access === 'denied' || access === 'blocked';
  const late = !permissionOff && anyOn && exact === false;
  if (!permissionOff && !late && (anyOn || permissionOnly)) return null;
  const open = async () => {
    if (late) { await requestExactAlarms(); await refresh(); return; }
    if (access === 'blocked') { await openNotificationSettings(); return; }
    if (access === 'denied') { const ok = await requestNotifications(); await refresh(); if (!ok) { Alert.alert('Bildirim izni verilmedi', 'İzni daha sonra telefon ayarlarından açabilirsin.'); return; } if (anyOn) return; }
    router.push('/settings/notifications');
  };
  const title = permissionOff ? 'Bildirimler kapalı' : late ? 'Hatırlatmalar gecikebilir' : 'Hatırlatmalar kapalı';
  const message = permissionOff
    ? anyOn ? 'Açtığın hatırlatmalar telefon izni olmadığı için gelmiyor.' : '“Bugün lens taktın mı?” sorusu ve değişim uyarıları için bildirimleri aç.'
    : late ? EXACT_MESSAGE : 'Şu an hiçbir hatırlatma açık değil; değişim günü yaklaşınca haber veremeyiz.';
  return <View accessibilityRole="alert" style={{ borderRadius: 16, borderWidth: 1.5, borderColor: '#F2CC8F', backgroundColor: '#FFF8EC', padding: 14, gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name={late ? 'alarm-outline' : 'notifications-off-outline'} size={22} color="#8A4B00"/><Copy bold size={16} style={{ flex: 1, color: '#5C3300' }}>{title}</Copy></View>
    <Copy size={14} style={{ color: '#5C3300' }}>{message}</Copy>
    <Button title={late ? 'İzni aç' : 'Bildirimleri aç'} icon={late ? 'alarm-outline' : 'notifications-outline'} onPress={open}/>
  </View>;
}
