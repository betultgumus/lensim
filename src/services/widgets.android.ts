import { requireOptionalNativeModule } from 'expo';
import type { AppState } from '../domain/types';
import { widgetSnapshot } from '../domain/widget';

/** Local module in modules/lens-widget. Missing in builds without it (e.g. Expo Go): the app keeps working without a widget. */
const LensWidget = requireOptionalNativeModule<{ update: (json: string) => Promise<void> }>('LensWidget');

/** Hands the widget the next days' precomputed cards and redraws every placed widget. */
export async function syncWidgets(state: AppState) {
  await LensWidget?.update(JSON.stringify(widgetSnapshot(state)));
}
