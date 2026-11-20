const fs = require('node:fs');
const path = require('node:path');
const config = require('../release.config.json');
const rawPrivacy = require('../src/domain/privacy.content.json');
const rawKvkk = require('../src/domain/kvkk.content.json');
const root = path.resolve(__dirname, '../store/web');
fs.mkdirSync(root, { recursive: true });
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Same placeholders as src/domain/legal.ts: nothing is guessed, missing facts stay visibly missing.
const MISSING = '[henüz belirtilmedi]';
const v = s => (s && String(s).trim()) || MISSING;
const fill = text => text
  .replace(/\{publisher\}/g, v(config.publisherName)).replace(/\{address\}/g, v(config.publisherAddress))
  .replace(/\{email\}/g, v(config.supportEmail)).replace(/\{deletionUrl\}/g, v(config.accountDeletionUrl))
  .replace(/\{region\}/g, v(config.cloudRegion)).replace(/\{basisCloud\}/g, v(config.kvkkLegalBasisCloud))
  .replace(/\{basisAccount\}/g, v(config.kvkkLegalBasisAccount)).replace(/\{retention\}/g, (config.retentionNote || '').trim()).trim();
const sections = rawPrivacy.map(s => ({ title: s.title, body: fill(s.body) }));
const kvkk = rawKvkk.map(s => ({ title: s.title, body: fill(s.body) }));
const ready = ['publisherName','publisherAddress','supportEmail','accountDeletionUrl','cloudRegion','kvkkLegalBasisCloud','kvkkLegalBasisAccount'].every(k => String(config[k] || '').trim());
const contact = config.publisherName && config.supportEmail ? `<p>Yayıncı: ${escape(config.publisherName)}</p><p>İletişim: <a href="mailto:${escape(config.supportEmail)}">${escape(config.supportEmail)}</a></p>` : '';
const draft = ready ? '' : '<p class="draft">Taslak: release.config.json içindeki yayıncı, adres, sunucu bölgesi, hukuki sebep veya silme adresi alanları eksik. Bu sayfa mağazaya sunulamaz.</p>';
const shell = (title,body) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${!ready?'<meta name="robots" content="noindex">':''}<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${title} · Lensim</title><style>body{margin:0;background:#fbfaff;color:#28233a;font:17px/1.7 system-ui,sans-serif}main{max-width:740px;margin:auto;padding:48px 24px}h1{font-size:36px;line-height:1.2}h2{font-size:22px;margin-top:32px}a{color:#7456c3}nav{display:flex;flex-wrap:wrap;gap:16px 24px}.brand{color:#7456c3;font-weight:700}.draft{padding:20px;background:#fff0e4;border-radius:12px}footer{border-top:1px solid #ded5eb;margin-top:40px;padding-top:24px}</style></head><body><main><p class="brand">◉ Lensim</p><nav><a href="privacy.html">Gizlilik</a><a href="kvkk.html">KVKK aydınlatma</a><a href="delete-account.html">Hesap ve veri silme</a><a href="support.html">Destek</a></nav>${draft}<h1>${title}</h1>${body}<footer>${contact}</footer></main></body></html>`;
const list = items => items.map(s=>`<section><h2>${escape(s.title)}</h2><p>${escape(s.body)}</p></section>`).join('');
const medical = sections.find(s=>s.title==='Tıbbi açıklama').body;

fs.writeFileSync(path.join(root,'privacy.html'),shell('Gizlilik Politikası','<p>Son güncelleme: 20 Kasım 2026</p>'+list(sections)));
fs.writeFileSync(path.join(root,'kvkk.html'),shell('KVKK Aydınlatma Metni','<p>Bu metin bilgilendirme amaçlıdır; okumak bir onay anlamına gelmez.</p>'+list(kvkk)));
// Google Play: a web page, reachable without the app, that explains how to request account and data deletion.
const mail = config.supportEmail ? `<a href="mailto:${escape(config.supportEmail)}?subject=${encodeURIComponent('Lensim hesap silme talebi')}">${escape(config.supportEmail)}</a>` : MISSING;
fs.writeFileSync(path.join(root,'delete-account.html'),shell('Lensim hesabını ve verilerini silme',`
<h2>Uygulamadan silme (önerilen)</h2><ol><li>Lensim’i aç ve hesabına giriş yap.</li><li>Ayarlar → Hesap yönetimi → <strong>Hesabımı sil</strong>.</li><li>Silinecekleri okuyup onayla. İşlem sunucuda tamamlandığında uygulama bunu bildirir.</li></ol>
<h2>Uygulama olmadan silme talebi</h2><p>Uygulamaya erişemiyorsan hesabında kayıtlı e-posta adresinden ${mail} adresine “Lensim hesap silme talebi” konulu bir e-posta gönder. Kimliğini doğrulamak için yalnızca hesabın e-posta adresinden gelen talepleri işleme alırız; parolanı veya sağlık bilgilerini gönderme.</p>
<h2>Neler silinir?</h2><ul><li>Lensim hesabın (e-posta adresi, giriş bilgileri, Google bağlantısı)</li><li>Buluttaki lens kullanım geçmişi, göz numaraları, göz günlüğü notları ve diğer yedek kayıtlar</li><li>Önceki eşitlemelerden kalan arşiv kopyaları ve oturum kayıtları</li></ul>
<h2>Neler saklanabilir?</h2><p>${escape(config.retentionNote ? config.retentionNote : 'Yasal bir saklama yükümlülüğü belirtilmedi. ' + MISSING)}</p>
<h2>Yalnızca bulut kopyasını silmek</h2><p>Hesabını korumak istiyorsan: Ayarlar → Gizlilik ve veriler → Bulut yedeği → <strong>Buluttaki kopyayı sil</strong>.</p>
<h2>Hesabı olmayan (misafir) kullanıcılar</h2><p>Misafir kayıtları yalnızca cihazında durur ve sunucumuzda bulunmaz. Silmek için Ayarlar → Gizlilik ve veriler → <strong>Cihazımdaki tüm verileri sil</strong> veya uygulamayı kaldır.</p>`));
fs.writeFileSync(path.join(root,'support.html'),shell('Nasıl yardımcı olabiliriz?',`<h2>Hatırlatma gelmiyor</h2><p>Uygulamada Ayarlar → Hatırlatmalar bölümünü aç. Bildirim iznini ve saati kontrol et. İşletim sisteminin bildirim ve pil ayarları teslimi etkileyebilir. Geçmiş saate bildirim kurulmaz.</p><h2>Android ana ekran widget’ı</h2><p>Ana ekrana uzun basıp Widget’lar → Lensim bölümünü aç. iOS widget’ı sonraki aşamada planlanmaktadır.</p><h2>Kayıtlarımı silmek istiyorum</h2><p>Cihazdaki bütün kayıtlar için Ayarlar → Gizlilik ve veriler → Cihazımdaki tüm verileri sil. Hesabını ve bulut yedeğini silmek için Ayarlar → Hesap yönetimi → Hesabımı sil. Ayrıntılar: <a href="delete-account.html">Hesap ve veri silme</a>.</p><h2>Telefon değişikliği</h2><p>Misafir kayıtlarını Ayarlar → Veri yedeği bölümünden dosyaya aktar. Hesabın ve bulut yedeğin açıksa yeni cihazda aynı hesaba girip bulut yedeğini açarak kayıtlarını geri al.</p><h2>Hata bildirme</h2><p>Destek e-postasına telefon modelini, işletim sistemi sürümünü, uygulama sürümünü ve sorunu nasıl tekrarlayabildiğini yaz. Sağlık notlarını veya kişisel bilgilerini göndermen gerekmez.</p><h2>Lens kullanımına ilişkin sorular</h2><p>${escape(medical)}</p>`));
console.log(ready ? 'Gizlilik, KVKK, hesap silme ve destek sayfaları oluşturuldu. HTTPS adreslerine yükleyip kayıt istemeden açıldığını kontrol edin.' : 'Taslak sayfalar oluşturuldu; release.config.json alanları bekleniyor.');
