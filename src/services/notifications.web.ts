import type { AppState } from '../domain/types';
import type { NotificationAccess } from './notifications';
/** The browser preview saves reminder choices but sends no notifications, so there is no permission to manage. */
export async function notificationAccess(): Promise<NotificationAccess> { return 'unavailable'; }
export async function openNotificationSettings() {}
export async function requestNotifications(): Promise<boolean> { return false; }
export async function syncNotifications(_state: AppState): Promise<void> {}
export async function exactAlarmAccess(): Promise<boolean> { return true; }
export async function requestExactAlarms(): Promise<boolean> { return true; }
