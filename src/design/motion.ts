import { useReducedMotion } from 'react-native-reanimated';
import { useApp } from '../state/AppContext';

/**
 * True when decorative motion may run. Honors the system "reduce motion" preference
 * (and the stored app setting) so animations never become a barrier.
 */
export function useCalmMotion(): boolean {
  const systemReduced = useReducedMotion();
  const { state } = useApp();
  return !(systemReduced || state.settings.reduceMotion);
}
