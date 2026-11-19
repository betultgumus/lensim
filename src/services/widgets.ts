import type { AppState } from '../domain/types';
/** The home-screen widget is Android-only (see widgets.android.ts); iOS and web have nothing to update. */
export async function syncWidgets(_state: AppState) {}
