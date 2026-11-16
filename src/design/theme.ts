import type { Settings } from '../domain/types';

/** Lensim V1 ships one light theme. Stored theme/mode/mascot settings from older versions are ignored. */
const light = {
  name: 'Lensim', dark: false, accent: '#0754C8', soft: '#E9F3FF', bright: '#83BDEB',
  background: '#EAF3FF', surface: '#FFFFFF', text: '#10265A', muted: '#4A5F80', border: '#C8DCF4',
  warning: '#9F5030', danger: '#A74447',
};
export function useTheme(_settings?: Settings) { return light; }
export type Theme = typeof light;
