/**
 * Rules for lens and glasses prescription values, shared by every form that takes them (first setup, new package,
 * Göz numaralarım). Typing and pasting keep only the characters a value can have; saving checks the full value and
 * explains in Turkish what is wrong, so a wrong entry never reaches the records or stops the app.
 */
type Rule = { name: string; min: number; max: number; signed: boolean; decimals: boolean; example: string };
export const RX_RULES: Record<string, Rule> = {
  PWR: { name: 'Lens gücü (PWR)', min: -30, max: 30, signed: true, decimals: true, example: '-2.50' },
  SPH: { name: 'Numara (SPH)', min: -30, max: 30, signed: true, decimals: true, example: '-2.25' },
  CYL: { name: 'Astigmat (CYL)', min: -10, max: 10, signed: true, decimals: true, example: '-0.75' },
  AXIS: { name: 'Eksen (AXIS)', min: 0, max: 180, signed: false, decimals: false, example: '90' },
  ADD: { name: 'Yakın ek (ADD)', min: 0.25, max: 4, signed: true, decimals: true, example: '+1.50' },
  BC: { name: 'Lens eğrisi (BC)', min: 7, max: 10, signed: false, decimals: true, example: '8.6' },
  DIA: { name: 'Lens çapı (DIA)', min: 12, max: 16, signed: false, decimals: true, example: '14.2' },
};
const format = (rule: Rule) => `${rule.min} ile ${rule.signed && rule.min < 0 ? '+' : ''}${rule.max} arasında${rule.decimals ? '' : ' tam'} bir sayı`;
/** What the field accepts, for the hint under it. */
export const rxHint = (code: string) => { const rule = RX_RULES[code]; return rule ? `${format(rule)} gir (ör. ${rule.example}).` : ''; };

/**
 * Keeps only what the value can contain: a leading + or − (signed values), digits and one decimal separator
 * (a comma becomes a dot). `removed` tells the field that something was dropped, so it can say why.
 */
export function sanitizeRx(code: string, raw: string): { value: string; removed: boolean } {
  const rule = RX_RULES[code];
  if (!rule) return { value: raw, removed: false };
  const text = raw.replace(/\s/g, '').replace(/[−–]/g, '-').replace(',', '.');
  let value = ''; let dot = false;
  for (const [i, ch] of [...text].entries()) {
    if (/\d/.test(ch)) value += ch;
    else if ((ch === '-' || ch === '+') && i === 0 && rule.signed) value += ch;
    else if (ch === '.' && rule.decimals && !dot) { dot = true; value += ch; }
  }
  value = value.slice(0, rule.decimals ? 7 : 3);
  return { value, removed: value.length < text.length };
}

/** Problem with a finished value, or null. Unfinished input such as "-" or "2." is only reported when saving. */
export function rxError(code: string, value: string, saving = false): string | null {
  const rule = RX_RULES[code]; const v = value.trim();
  if (!rule || !v) return null;
  const complete = rule.decimals ? /^[+-]?\d+(\.\d+)?$/ : /^\d+$/;
  if (!complete.test(v)) return saving || /[^0-9+\-.]/.test(v) ? `${rule.name}: “${v}” bir sayı değil. ${format(rule)} gir (ör. ${rule.example}).` : null;
  const n = Number(v);
  if (n < rule.min || n > rule.max) return `${rule.name} ${format(rule)} olmalı (ör. ${rule.example}).`;
  return null;
}

/**
 * Checks the values about to be saved (keys such as "SPH" or "right-SPH"). Throws one clear Turkish message for
 * the first wrong value, naming the eye when the two eyes are entered separately; the form shows it and stays open.
 */
export function assertRxValues(values: Record<string, string>) {
  for (const [key, raw] of Object.entries(values)) {
    const [, side, code] = /^(?:(right|left)-)?(.+)$/.exec(key) ?? [];
    const problem = code ? rxError(code, raw ?? '', true) : null;
    if (problem) throw new Error(`${side === 'right' ? 'Sağ göz · ' : side === 'left' ? 'Sol göz · ' : ''}${problem} Değeri düzeltip tekrar kaydet.`);
  }
}
