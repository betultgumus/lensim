# Cihaz doğrulama listesi

Bu liste bir başarı raporu değildir. Aşağıdaki kontroller native derleme sonrası yapılacak.

## İlk açılış ve temel takip

- [ ] Temiz kurulumda demo kayıt, üyelik, stok veya günlük zorlaması yok.
- [ ] Bildirim izni reddedilerek onboarding tamamlanıyor.
- [ ] Kurulum sırasında kapanınca güvenle yeniden başlanıyor.
- [ ] 31 Ocak → Şubat sonu; 30 gün seçeneğinde farklı tarih.
- [ ] Geçmiş / gelecek başlangıç, bugün ve gecikme doğru görünüyor.
- [ ] Uygulama kapatılıp açıldığında SQLite kayıtları duruyor.
- [ ] Lens değiştirme, stok ve geçmiş birlikte kaydediliyor; hızlı çift dokunuş iki kayıt açmıyor.
- [ ] Geri alma önceki döngüyü ve stoğu geri getiriyor.
- [ ] Günlük lens atılınca otomatik yeni lens açılmıyor.
- [ ] Geçmiş düzeltme sonraki bağlı döngüyü / bildirimi güncelliyor.

## Modüller ve görünüm

- [ ] Her modül açılıp kapatılabiliyor; kapalı modül ana ekrandan ve bildirim planından kalkıyor.
- [ ] Modül tekrar açılınca eski veriler duruyor.
- [ ] Sağ ve sol göz farklı plan / tarihle bağımsız çalışıyor.
- [ ] Stok 0 altına inmiyor; ayrı göz 1, birlikte 2 lens azaltıyor.
- [ ] Günlük notu ekleniyor ve tek tek silinebiliyor.
- [ ] Solüsyon / kap yeni kayıtları geçmişi koruyor.
- [ ] Beş tema ve sistem / açık / koyu görünüm kalıcı.
- [ ] Maskot, uyarı durumları, başarı ve azaltılmış hareket doğru.
- [ ] 320–375pt ekran, 200% yazı, tablet, klavye ve safe area kullanılabilir.
- [ ] VoiceOver / TalkBack ile buton, tarih seçimi ve sayaç anlaşılır.
- [ ] Uzun geçmişte liste performansı ve sayfalama davranışı kontrol edildi.

## Native widget

- [ ] iOS prebuild küçük / orta extension ve App Group’u oluşturuyor.
- [ ] Android autolinking LensWidget modülünü ve iki provider’ı derliyor.
- [ ] İlk açılıştan önce boş widget “Lens takibini başlat” gösteriyor.
- [ ] İki platformda küçük / orta widget ana ekrana ekleniyor.
- [ ] Stil / tema / maskot / göz tercihi gerçek state’ten geliyor.
- [ ] Bildirim izni kapalıyken widget çalışıyor.
- [ ] Lens değişimi sonrası widget yenileniyor.
- [ ] Uygulama kapalıyken gece yarısı / DST / saat dilimi değişimi.
- [ ] Android yeniden başlatma, pil tasarrufu, force-stop sonrası davranış.
- [ ] Widget’a dokununca doğru uygulama açılıyor.
- [ ] Uzun yoklukta iOS fallback eski sayı göstermiyor.
- [ ] Koyu tema, yeniden boyutlandırma, sistem widget tint kontrol edildi.

## Bildirim ve gizlilik

- [ ] Android channel / POST_NOTIFICATIONS ve iOS izinleri doğru.
- [ ] 3 gün, 1 gün, değişim günü seçilen saatte planlanıyor.
- [ ] Eski döngü planı iptal; yenisinde mükerrer bildirim yok.
- [ ] Geçmiş saate bildirim planlanmıyor.
- [ ] Ayar veya modül kapanınca ilgili bildirimler kaldırılıyor.
- [ ] Uygulama kapalıyken bildirim teslimi gerçek cihazda denendi.
- [ ] Tüm verileri sil: onay, yerel kayıtlar temiz, widget boş, bildirimler iptal.
- [ ] Paketlerde analitik / remote push / ücretli API / hassas izin bulunmuyor.

## Yayın kapısı

- [x] Paket kurulumu, SDK sürüm hizalaması ve lockfile
- [ ] `npm run doctor`
- [x] `npm run typecheck`
- [x] `npm test` — 52 test
- [x] `npm run test:ui` — 5 ekran akışı
- [x] iOS/Android Metro üretim paketleri ve prebuild
- [x] iOS widget bundle / registry üretimi
- [x] Android widget tarih yardımcı sınıfı Java doğrulaması
- [ ] Android debug ve release build
- [ ] iOS simulator ve imzalı release build
- [ ] Mağaza gizlilik / imzalama / ekran görüntüleri
