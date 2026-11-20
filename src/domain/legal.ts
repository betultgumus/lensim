/**
 * Legal texts take publisher facts (name, address, contact, server region, legal bases) from release.config.json.
 * Nothing is guessed: an empty field is shown as "henüz belirtilmedi" and `npm run release:check` blocks a store
 * build until every field is filled in.
 */
export type LegalConfig = {
  publisherName?: string; publisherAddress?: string; supportEmail?: string; accountDeletionUrl?: string;
  cloudRegion?: string; kvkkLegalBasisCloud?: string; kvkkLegalBasisAccount?: string; retentionNote?: string;
};
export type LegalSection = { title: string; body: string };
export const MISSING = '[henüz belirtilmedi]';

export function fillLegal(text: string, c: LegalConfig): string {
  const v = (s?: string) => (s && s.trim()) || MISSING;
  return text
    .replace(/\{publisher\}/g, v(c.publisherName))
    .replace(/\{address\}/g, v(c.publisherAddress))
    .replace(/\{email\}/g, v(c.supportEmail))
    .replace(/\{deletionUrl\}/g, v(c.accountDeletionUrl))
    .replace(/\{region\}/g, v(c.cloudRegion))
    .replace(/\{basisCloud\}/g, v(c.kvkkLegalBasisCloud))
    .replace(/\{basisAccount\}/g, v(c.kvkkLegalBasisAccount))
    .replace(/\{retention\}/g, (c.retentionNote ?? '').trim())
    .replace(/\s+$/, '');
}
export const fillSections = (sections: LegalSection[], c: LegalConfig) => sections.map(s => ({ title: s.title, body: fillLegal(s.body, c) }));
/** Fields that must be filled before the legal texts can be published. */
export const missingLegalFields = (c: LegalConfig) =>
  (['publisherName', 'publisherAddress', 'supportEmail', 'accountDeletionUrl', 'cloudRegion', 'kvkkLegalBasisCloud', 'kvkkLegalBasisAccount'] as const).filter(k => !(c[k] ?? '').trim());

/** The exact medical disclaimer shown under Ayarlar → Hakkında (and in the privacy policy). */
export const MEDICAL_DISCLAIMER = 'Lensim bir tıbbi cihaz değildir. Herhangi bir sağlık durumunu teşhis etmez, tedavi etmez, iyileştirmez veya önlemez. Uygulama, kontakt lens kullanımını kaydetmek ve kişisel hatırlatmalar oluşturmak amacıyla tasarlanmıştır. Uygulamadaki bilgiler tıbbi tavsiye, teşhis veya tedavinin yerine geçmez. Göz sağlığınız ve kontakt lens kullanımıyla ilgili kararlar için göz hekiminize danışınız.';
