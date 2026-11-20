# Lensim · UX iyileştirmeleri ve risk incelemesi

## Bu teslimde

- Lens kutusundaki aşım sayısı kırmızı yazılır; sayı çevresinde alarm rozeti/dolgusu kullanılmaz.
- Takvim kartında sabit nötr çerçeve kullanılır. Günlük kullanım kartındaki baykuş/süre uyarısı takvime taşınmaz.
- Takvim açıklaması kayıt durumlarını ikon ve metinle gösterir. Otomatik kayıt, açık ve kesik kenarlı günlerden ayırt edilir.
- Cevapsız gün bildirimi gerçek `DailyStatus.date`, `status` ve `automatic` verilerinden türetilir. “Kaydı düzelt” tam o tarihi takvimde açar. Düzeltme reducer üzerinden mevcut günü manuele çevirir; manuel günler otomatik doldurma tarafından değiştirilmez.
- İlk kurulumda cevapsız gün varsayılanı (“Taktım” / “Takmadım”) görünürdür. Hatırlatmalar isteğe bağlı ve ilk durumda kapalıdır; kullanıcı “Hatırlatıcıları ayarla” derse izin, paket kaydından sonra sorulur. “Şimdi değil” temel takibi engellemez.
- Yardım ekranı FDA, CDC ve AAO bağlantılarıyla uygulamaya eklendi; kaynaklar ve son gözden geçirme tarihi gösterilir. Yardım metni tanı/tedavi önermez.
- Android widget değişiklikleri 2×1 ve 1×1 XML/Kotlin sunumuyla sınırlıdır. 2×1 baykuşu var olan uygulama görselinden gelir; gün sayısı ve “X gün takıldı” ayrı gerçek sayaç verileridir.

## Kod üzerinden risk senaryoları

| Senaryo | Mevcut davranış / güvenli sınır |
|---|---|
| İlk kurulum yarım kalır | `onboarded` yalnızca `openPackages` başarıyla tamamlanınca true olur; ilk kullanımda zorunlu yeni kutu ve paket akışı açılır. Kayıt olmadan yarım kalan kurulum iz bırakmaz. |
| Kutusuz takip | Yeni paket akışında `unboxed` ve 1–365 gün kullanım süresi desteklenir. İlk kurulum hedefi mevcut kutuyu girmek olduğundan başlangıç akışı kutulu kalır; sonradan kutusuz takip seçilebilir. |
| Yanlış kutu/açılış tarihi | Paket/kutu düzenleme ve silme akışları mevcut. Reducer açılışı son 30 günle sınırlar, çift göz/paket çakışmalarını reddeder; kutu silme/açılış düzeltme ve stok iadesi gerçek cihaz kabulünde ayrıca denenmeli. |
| Sağ/sol farklı paket | Model göz başına paket ve kutu taşır; ayrı kutu, süre ve açılış tarihi desteklenir. Günlük durum tek tarihli ortak yanıttır. |
| Otomatik gün elle düzeltilir | `DailyStatus.automatic` false yapılır ve o güne bağlı paket kayıtları da eşitlenir. Daha sonraki otomatik doldurma mevcut yanıtı ezmez. |
| Stok sıfır / sayaç uyuşmaz | Paket açılışı stok kontrolünü reducer’da yapar; günlük lens stoku yalnız “Taktım” gününde düşer ve düzeltmede geri hesaplanır. Negatif stok reddedilir. Kutudaki yedek sayısı ile açık paket sayacı farklı kavramlardır. |
| Bildirim izni reddedilir/kapatılır | İzin yalnız kullanıcı hatırlatmayı etkinleştirince istenir. İzin kapalı durum Ayarlar’da görünür ve uygulama geri döndüğünde tekrar okunur; uygulama takvimi/kayıtları yerel SQLite’ta çalışır. Web uygulaması izin istemez ve bildirim yollamaz. |
| Eski/eksik yedek veya kayıt çakışması | Yedek içe aktarma mevcut uygulamada doğrulama sonrası değiştirir; eski state varsayılanları migrate edilir. Bu UX işi geri yükleme algoritmasını değiştirmiyor; bozuk dosya ve çakışma davranışı iki cihazda kabul testinde doğrulanmalı. |
| İki cihazda eşzamanlı değişiklik | Hesap yedeği sunucu revizyonunu atomik karşılaştırır. İlk aktarım kayıtları kimliklerine göre birleştirir; aynı gündeki cevapta bu cihaz kazanır ve önceki bulut kopyası arşivlenir. Reducer doğrulaması başarısız olursa cihaz verisi değiştirilmez. Gerçek cihaz ve iki cihaz testi hâlâ gerekir. |
| Ağ yok | Temel takip ağ gerektirmiyor; native SQLite ve web IndexedDB ayrı yerel kaynaklardır. Web önizlemesi verisi telefona eşitlenmez. |

## Sürüm ve bulunabilirlik sınırı

İzlenen ürün hattı Expo / React Native ve sürüm `1.0.0`. Misafir kullanım temel işlevlere doğrudan erişir; Google veya e-posta hesabı bulut yedeği için isteğe bağlıdır. Android widget’ın kaynak kodu mevcut; butonlu 2×3 widget ve başlatıcı/erişilebilirlik cihaz kabulü hâlâ açık. iOS widget ve İngilizce sonraki aşamadadır.

Uygulama içi yardım tek başına web SEO sağlamaz. İleride ayrı bir içerik projesinde arama motorlarının tarayabildiği, mobil uyumlu yardım/blog sayfaları ve güvenilir editoryal kaynaklandırma değerlendirilebilir. Google Play başlığı, açıklaması, ikon ve ekran görüntüleri ASO/mağaza işi olarak ayrı değerlendirilmelidir. Bu değişiklikte site/blog veya mağaza metadata’sı üretilmedi; sıra ya da sonuç garantisi yoktur.

## Görsel dil notu

Uygulamadaki aynı `owl-1-lively.png` baykuşu widget’a eklendi. Gözlük günü için baykuşun yüzüne yeni gözlük çizmek mevcut varlıklarda karşılığı olmayan bir poz/illüstrasyon ister ve süre uyarısı maskotuyla günlük kayıt anlamını karıştırabilir. Bu turda günlük yanıt ikonunda “Gözlük” mevcut; karakter yüzünde yeni varyant üretilmedi. Mevcut azaltılmış hareket ayarı baykuş animasyonunu durdurmaya devam eder.
