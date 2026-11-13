import { useColorScheme } from 'react-native';
import type { Settings } from '../domain/types';
export const palettes = {
  lavender: { name: 'Lavanta', accent: '#7456C3', soft: '#F2EDFF', bright: '#B6A0F5' },
  mint: { name: 'Mint', accent: '#267257', soft: '#E4F6EC', bright: '#88D6B0' },
  rose: { name: 'Pudra', accent: '#A14472', soft: '#FBEAF3', bright: '#E7A8C6' },
  peach: { name: 'Şeftali', accent: '#A15B31', soft: '#FFF0E5', bright: '#F0B68F' },
  sky: { name: 'Gökyüzü', accent: '#346CA2', soft: '#E8F3FF', bright: '#9EC8EE' },
};
export function useTheme(settings: Settings) {
  const system = useColorScheme(); const dark = settings.mode === 'dark' || (settings.mode === 'system' && system === 'dark');
  const p = palettes[settings.theme];
  return { ...p, dark, accent: dark ? p.bright : p.accent, soft: dark ? '#30283F' : p.soft,
    background: dark ? '#17141F' : '#FBFAFF', surface: dark ? '#24202E' : '#FFFFFF',
    text: dark ? '#F4F0FA' : '#28233A', muted: dark ? '#B9B0C8' : '#787286', border: dark ? '#3C3449' : '#EDE8F3',
    warning: dark ? '#F0B68F' : '#9F5030', danger: dark ? '#FFB3B1' : '#A74447',
  };
}
export type Theme = ReturnType<typeof useTheme>;
