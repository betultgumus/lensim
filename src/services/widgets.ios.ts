import LensCountdown from '../../widgets/LensCountdown.ios';
import { generateWidgetTimeline } from '../domain/effects';
import type { AppState } from '../domain/types';
export async function syncWidgets(state: AppState) { LensCountdown.updateTimeline(generateWidgetTimeline(state)); }
