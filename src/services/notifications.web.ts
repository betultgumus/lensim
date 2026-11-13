import type { AppState } from '../domain/types';
export async function requestNotifications(): Promise<boolean> { return false; }
export async function syncNotifications(_state: AppState): Promise<void> {}
