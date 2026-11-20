# Lensim V1 · Android cihaz kontrol listesi

Bu liste bir başarı raporu değildir. APK telefona kurulduktan sonra sırayla denenir; her maddenin yanına sonucu ve cihaz/Android sürümünü yaz.

## 1. İlk kurulum
- [ ] Temiz kurulumda hesap, demo kayıt veya zorunlu alan yok; uygulama ikonu ve açılış ekranı Lensim baykuşu.
- [ ] Bildirim izni **reddedilerek** kurulum tamamlanıyor; uygulama çalışmaya devam ediyor.
- [ ] Kurulumda 1 Kasım gibi geçmiş bir tarih seçilince kayıttan sonra “Günleri düzenle” ekranı açılıyor.
- [ ] Varsayılan cevap “Taktım sayılsın”: geçmiş günler takvimde soluk ve kesik çizgili görünüyor.

## 2. Günlük kullanım
- [ ] “Taktım / Takmadım / Gözlük” tek dokunuşla iki göze birlikte kaydediliyor.
- [ ] Takvim panelinde bir güne dokunup düzeltince sayaçtaki “gün taktın” sayısı değişiyor.
- [ ] Otomatik sayılmış bir günü elle “Gözlük” yapınca ertesi gün otomatik doldurma onu geri değiştirmiyor.
- [ ] Ana ekranda yatay kaydırma ve alttaki “Bugün / Takvim” sekmeleri aynı paneli gösteriyor; “2 sayfadan 1’i / 2’si” doğru.
- [ ] Gece 01:30’da açınca gün hâlâ dün; 02:01’de açınca yeni gün (takip günü 02:00’de değişir).

## 3. Paket ve kutu
- [ ] Var olan kutudan yeni paket açınca süre seçimi görünmüyor, kutunun süresi kullanılıyor; günlük kutu günlük kalıyor.
- [ ] Önceki paketten birkaç gün sonra (geriye dönük) yeni paket açılıyor ve **kaydediliyor**; eski günlerin cevapları duruyor.
- [ ] Yanlış açılan yeni paket silinince önceki paket yeniden açılıyor; iki göz birlikte silinebiliyor; kutuya lens geri ekleniyor.
- [ ] “Her göze ayrı kutu” ile sağ ve sol farklı kutudan açılıyor; günlük cevap yine iki göze yazılıyor.
- [ ] Paket düzenle → “İki göz” seçiliyken sağ ve sol birlikte değişiyor.
- [ ] Kutudaki yedek lens sayısı ana ekranda görünüyor ve paket açınca azalıyor.
- [ ] Baykuş: aylık lenste 20. günde uykulu, 31. günde uyarıda; 15 günlükte 10. ve 16. gün; günlük ve 3 aylıkta hep sakin.

## 4. Numara (reçete)
- [ ] Android klavyesiyle `-2.50`, `+1.25`, `8.6`, `14,2` girilebiliyor.
- [ ] Göz “Sol” seçiliyken alan etiketleri “Sol ·” diye başlıyor; “Farklı” → tek göz geçişinde yazılan değer kaybolmuyor.
- [ ] Lens ve gözlük numaraları ayrı ve tarihli listeleniyor.

## 5. Yedek
- [ ] “Yedek dosyası kaydet” klasör seçtiriyor ve `.json` dosyası oluşuyor.
- [ ] Başka bir telefonda (veya uygulamayı silip yeniden kurduktan sonra) “Yedek dosyası seç” → özet ve onay → kayıtlar geri geliyor.
- [ ] Onaydan sonra “Önceki kayıtlara dön” çalışıyor.
- [ ] Bozuk/alakasız bir dosya seçilince veri değişmeden hata gösteriliyor.

## 6. Misafir, hesap ve bulut yedeği (Supabase test projesi gerekir)
- [ ] Hesapsız kurulumda temel kullanım, kayıt ve geçmiş çevrimdışıyken çalışıyor.
- [ ] E-posta/parola ve Google ile hesap açma/giriş, e-posta doğrulama ve parola sıfırlama akışları fiziksel Android cihazda tamamlanıyor.
- [ ] Sadece giriş yapmak hiçbir lens verisini yüklemiyor; bulut yedeği kapalı kalıyor.
- [ ] Bulut yedeği ayrı ekranda açıkça etkinleştirildikten sonra misafir kutuları/paketleri/geçmişi hesaba bir kez aktarılıyor.
- [ ] Aynı hesabı ikinci cihazda açıp bulut yedeğini etkinleştirince kayıtlar geri geliyor; iki cihazda aynı gün farklı cevap varsa ekranda belirtilen cihaz kuralı uygulanıyor.
- [ ] Ağ kesilmesi, oturumun süresinin dolması ve yeniden deneme yerel kayıtlara zarar vermiyor.
- [ ] Bulut yedeğini kapatma yüklemeyi durduruyor; “bulut kopyasını sil” seçilirse yedek ve arşivi silinip doğrulanıyor.
- [ ] Hesabı silme, sunucuda hesabı ve bulut kopyalarını kaldırıyor; cihaz verisini sakla/sil seçimi doğru çalışıyor.
- [ ] Araştırma paylaşımı tercihi yerel kalıyor; tercih ne olursa olsun araştırma verisi ağ üzerinden gönderilmiyor.

## 7. Bildirim ve arka plan
- [ ] Android 13+ bildirim izni penceresi çıkıyor; sonradan Ayarlar’dan kapatılınca uygulama çalışmaya devam ediyor.
- [ ] Günlük hatırlatma uygulama kapalıyken seçilen saatte geliyor; bildirimdeki “Taktım” iki gözü işaretliyor.
- [ ] Telefon yeniden başlatıldıktan sonra hatırlatma hâlâ geliyor.
- [ ] Pil tasarrufu agresif bir cihazda (Xiaomi/Samsung) bir gece bekletip deneme.
- [ ] Uygulama 3 gün açılmayınca: açılışta kaçan günler otomatik dolduruluyor ve “N gün otomatik dolduruldu” kartı çıkıyor.

## 8. Widget, görünüm ve erişilebilirlik
- [ ] Var olan 2×1 ve 1×1 widget’lar çalışmaya devam ediyor ve uygulamayı doğru ekrana açıyor.
- [ ] Yeni 2×3 widget ekleniyor; “Taktım” ve “Takmadım” düğmeleri Lensim ekranını açmadan bugünün durumunu kaydediyor.
- [ ] Widget’tan kaydedilen cevap uygulama açılınca takvimde, sayaçta, paket geçmişinde ve günlük stokta aynı görünüyor; art arda basma ve uygulama/widget eşzamanlı kayıt denemesi veri çoğaltmıyor.
- [ ] Paket yokken widget eylemi lens kullanımı kaydetmiyor ve görünümü tutarlı tutuyor.
- [ ] Birkaç Android başlatıcıda widget boyutu, yeniden boyutlandırma, ekran yoğunluğu ve TalkBack etiketleri kontrol ediliyor.
- [ ] 360 dp ve 412 dp genişlikte yatay taşma yok; sayaç kapakların içinde.
- [ ] Yazı boyutu %200’de düğmeler ve takvim kullanılabilir.
- [ ] Telefon koyu moddayken uygulama açık modda ve okunaklı kalıyor.
- [ ] TalkBack sayaçları “Sağ göz: 12. gün, 30 günlük” gibi okuyor; takvim günleri tarih ve durumla okunuyor.

## 9. Kalıcılık
- [ ] Uygulama kapatılıp açılınca kayıtlar duruyor.
- [ ] Yeni APK sürümü üstüne kurulunca kayıtlar duruyor.
- [ ] “Tüm verilerimi sil” onay istiyor, hatırlatmaları iptal ediyor ve kuruluma dönüyor.

## Yayın kapısı (geliştirici)
- [x] `npm run typecheck`
- [x] `npm test` — 75 test
- [x] `npm run test:ui` — 4 ekran akışı
- [x] `npm run test:web` — web duman testi
- [ ] EAS `preview` profiliyle Android APK
- [ ] Yukarıdaki cihaz maddeleri
- [ ] `npm run release:check` (yayıncı adı, destek e-postası, gizlilik ve destek URL’si)
