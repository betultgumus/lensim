/**
 * Calendar colors for a day's answer. Automatic days keep their answer's color in a
 * softer tint (and screens draw them with a dashed edge) instead of a separate warning color.
 */
export const palette = {
  right: '#0754C8', left: '#83BDEB', leftText: '#2C6AA0', ink: '#10265A', inkSoft: '#405B86',
  glasses: '#7956B5', glassesText: '#5B3F8F', warning: '#B8660F', danger: '#C8243B', empty: '#E3E9F1',
};
type Entry = { status: 'worn' | 'notWorn' | 'glasses'; automatic: boolean } | undefined | null;
export function dayTone(entry: Entry): { fill: string; text: string; label: string } {
  if (!entry) return { fill: 'transparent', text: palette.ink, label: 'Kayıt yok' };
  const auto = entry.automatic;
  if (entry.status === 'worn') return auto ? { fill: '#B9D1F3', text: palette.ink, label: 'Lens taktım · otomatik' } : { fill: palette.right, text: '#FFFFFF', label: 'Lens taktım' };
  if (entry.status === 'glasses') return auto ? { fill: '#E2D8F3', text: palette.ink, label: 'Gözlük · otomatik' } : { fill: palette.glasses, text: '#FFFFFF', label: 'Gözlük taktım' };
  return auto ? { fill: '#E4F0FA', text: palette.ink, label: 'Lens takmadım · otomatik' } : { fill: palette.left, text: palette.ink, label: 'Lens takmadım' };
}
