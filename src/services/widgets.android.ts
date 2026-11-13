import { requireNativeModule } from 'expo';
import type { AppState } from '../domain/types';
import { androidWidgetSnapshot } from '../domain/effects';
export async function syncWidgets(state: AppState) {
  const native = requireNativeModule<{ update: (json: string) => Promise<void> }>('LensWidget');
  await native.update(JSON.stringify(androidWidgetSnapshot(state)));
}
