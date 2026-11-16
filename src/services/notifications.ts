import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppState } from '../domain/types';
import { notificationPlan } from '../domain/effects';
import { clearNotificationRecords, rememberNotification } from '../data/database';
import { reminderDiff } from '../domain/notificationSync';
import { dateOnly } from '../domain/dates';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
export async function requestNotifications(): Promise<boolean> {
  await Notifications.setNotificationCategoryAsync('daily-checkin', [
    { identifier:'worn', buttonTitle:'Taktım', options:{ opensAppToForeground:true } },
    { identifier:'notWorn', buttonTitle:'Takmadım', options:{ opensAppToForeground:true } },
  ]);
  await Notifications.setNotificationCategoryAsync('package-expired', [
    { identifier:'open-package', buttonTitle:'Yeni paket aç', options:{ opensAppToForeground:true } },
  ]);
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('lens-reminders', { name: 'Lens hatırlatıcıları', importance: Notifications.AndroidImportance.DEFAULT });
  const permission = await Notifications.requestPermissionsAsync();
  return permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}
export async function syncNotifications(state: AppState) {
  // Reconcile OS records too: recovers if a process died between scheduling and recording an ID.
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const permission = await Notifications.getPermissionsAsync();
  const granted = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  const desired = granted ? notificationPlan(state) : [];
  const diff = reminderDiff(existing.map(n => ({ id:n.identifier, owner:n.content.data?.owner, body:n.content.body })), desired);
  for (const id of diff.cancel) await Notifications.cancelScheduledNotificationAsync(id);
  await clearNotificationRecords();
  for (const id of diff.keep) await rememberNotification(id,id);
  if (!state.settings.notifications) return;
  if (!granted) throw new Error('Bildirim izni kapalı. Takibin çalışmaya devam ediyor.');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('lens-reminders', { name:'Lens hatırlatıcıları', importance:Notifications.AndroidImportance.DEFAULT });
  await Notifications.setNotificationCategoryAsync('daily-checkin', [
    { identifier:'worn', buttonTitle:'Taktım', options:{ opensAppToForeground:true } },
    { identifier:'notWorn', buttonTitle:'Takmadım', options:{ opensAppToForeground:true } },
  ]);
  await Notifications.setNotificationCategoryAsync('package-expired', [
    { identifier:'open-package', buttonTitle:'Yeni paket aç', options:{ opensAppToForeground:true } },
  ]);
  for (const reminder of diff.schedule) {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: reminder.key,
      content: { title: 'Lensim', body: reminder.body, sound: 'default', ...(reminder.kind?{categoryIdentifier:reminder.kind==='daily-checkin'?'daily-checkin':'package-expired'}:{}), data: { owner: 'lens-takip', url: 'lenstakip:///', ...(reminder.kind?{kind:reminder.kind,packageIds:reminder.packageIds,date:dateOnly(reminder.date),eye:reminder.eye}:{}) } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: 'lens-reminders' },
    });
    await rememberNotification(id, reminder.key);
  }
}
