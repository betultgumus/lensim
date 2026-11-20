import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { AppState } from '../domain/types';
import { notificationPlan } from '../domain/effects';
import { clearNotificationRecords, rememberNotification } from '../data/database';
import { reminderDiff } from '../domain/notificationSync';
import { dateOnly } from '../domain/dates';

/**
 * Android channel for every Lensim reminder. HIGH importance so the reminder pops up on screen instead of only
 * landing silently in the shade. A channel's importance cannot be raised after it is created, so this is a new
 * channel; the old DEFAULT one is removed and reminders scheduled on it are scheduled again (see `syncNotifications`).
 */
const CHANNEL = 'lensim-reminders';
const OLD_CHANNEL = 'lens-reminders';
/** granted · denied (can still be asked) · blocked (only the system settings can turn it on) · unavailable (web). */
export type NotificationAccess = 'granted' | 'denied' | 'blocked' | 'unavailable';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
const isGranted = (p: Notifications.NotificationPermissionsStatus) => p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

async function prepareChannelAndActions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Lens hatırlatıcıları', importance: Notifications.AndroidImportance.HIGH });
    await Notifications.deleteNotificationChannelAsync(OLD_CHANNEL).catch(() => {});
  }
  await Notifications.setNotificationCategoryAsync('daily-checkin', [
    { identifier:'worn', buttonTitle:'Taktım', options:{ opensAppToForeground:true } },
    { identifier:'notWorn', buttonTitle:'Takmadım', options:{ opensAppToForeground:true } },
  ]);
  await Notifications.setNotificationCategoryAsync('package-expired', [
    { identifier:'open-package', buttonTitle:'Yeni paket aç', options:{ opensAppToForeground:true } },
  ]);
}

export async function notificationAccess(): Promise<NotificationAccess> {
  const permission = await Notifications.getPermissionsAsync();
  return isGranted(permission) ? 'granted' : permission.canAskAgain ? 'denied' : 'blocked';
}
/** Opens Lensim's page in the phone settings, where notifications can be allowed. */
export async function openNotificationSettings() { await Linking.openSettings(); }

/**
 * Android 12+ "Alarmlar ve hatırlatıcılar" (exact alarm) access. Without it Android schedules the reminders as
 * inexact alarms, which battery saving can push back by hours or drop on some phones — the reason a reminder can
 * arrive on one phone and never on another. Always true below Android 12, on iOS and when the check fails.
 */
export async function exactAlarmAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try { return (await Notifications.getExactAlarmPermissionsAsync()).granted; } catch { return true; }
}
/** Opens the system screen that allows exact alarms; resolves with the new state when the person comes back. */
export async function requestExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try { return (await Notifications.requestExactAlarmPermissionsAsync()).granted; } catch { await Linking.openSettings(); return exactAlarmAccess(); }
}

export async function requestNotifications(): Promise<boolean> {
  // On Android 13+ the channel must exist before asking, otherwise the system dialog is not shown.
  await prepareChannelAndActions();
  return isGranted(await Notifications.requestPermissionsAsync());
}
export async function syncNotifications(state: AppState) {
  // Reconcile OS records too: recovers if a process died between scheduling and recording an ID.
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const granted = isGranted(await Notifications.getPermissionsAsync());
  const exact = await exactAlarmAccess();
  const desired = granted ? notificationPlan(state) : [];
  // A reminder scheduled on an older channel, or before exact alarms were allowed/revoked, counts as changed: it is
  // cancelled and scheduled again, so every pending reminder uses the current channel and the exact alarm when allowed.
  const diff = reminderDiff(existing.map(n => ({ id:n.identifier, owner:n.content.data?.owner, body:n.content.data?.channel === CHANNEL && n.content.data?.exact === exact ? n.content.body : null })), desired);
  for (const id of diff.cancel) await Notifications.cancelScheduledNotificationAsync(id);
  await clearNotificationRecords();
  for (const id of diff.keep) await rememberNotification(id,id);
  if (!state.settings.notifications && !state.settings.nightReminder) return;
  if (!granted) throw new Error('Bildirim izni kapalı. Takibin çalışmaya devam ediyor.');
  await prepareChannelAndActions();
  for (const reminder of diff.schedule) {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: reminder.key,
      content: { title: 'Lensim', body: reminder.body, sound: 'default', ...(reminder.kind==='daily-checkin'||reminder.kind==='package-expired'?{categoryIdentifier:reminder.kind}:{}), data: { owner: 'lens-takip', channel: CHANNEL, exact, url: 'lenstakip:///', ...(reminder.kind?{kind:reminder.kind,packageIds:reminder.packageIds,date:dateOnly(reminder.date),eye:reminder.eye}:{}) } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: CHANNEL },
    });
    await rememberNotification(id, reminder.key);
  }
}
