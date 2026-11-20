const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'release.config.json'), 'utf8'));
const errors = [];
if (!config.publisherName?.trim()) errors.push('Yayıncı adı eksik: release.config.json → publisherName');
if (!config.publisherAddress?.trim()) errors.push('KVKK veri sorumlusu adresi eksik: publisherAddress');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.supportEmail || '')) errors.push('Geçerli destek e-postası eksik: supportEmail');
for (const key of ['privacyUrl', 'supportUrl', 'accountDeletionUrl']) {
  try { const url = new URL(config[key]); if (url.protocol !== 'https:' || /localhost|example\.|127\.0\.0\.1/.test(url.hostname)) throw new Error(); }
  catch { errors.push(`Herkese açık HTTPS adresi eksik: ${key}`); }
}
// Legal facts are never guessed by the code; a lawyer/publisher decision must be written here before release.
if (!config.cloudRegion?.trim()) errors.push('Supabase sunucu bölgesi eksik: cloudRegion (yurt dışı aktarım değerlendirmesi için)');
if (!config.kvkkLegalBasisCloud?.trim()) errors.push('Bulut yedeği için KVKK hukuki sebebi eksik: kvkkLegalBasisCloud (hukuki değerlendirme gerekir)');
if (!config.kvkkLegalBasisAccount?.trim()) errors.push('Hesap için KVKK hukuki sebebi eksik: kvkkLegalBasisAccount (hukuki değerlendirme gerekir)');
if (!fs.existsSync(path.join(root,'package-lock.json'))) errors.push('Doğrulanmış package-lock.json eksik.');
if (errors.length) { console.error('Mağaza derlemesi için tamamlanması gereken bilgiler:\n'+errors.map(e=>'• '+e).join('\n')); process.exitCode=1; }
else console.log('Yayın kimliği, hukuki alanlar ve destek adresleri dolu. Hesap, imzalama ve cihaz kabul sonuçları ayrıca doğrulanmalı.');
