# Lensim · Mağaza teslimi

Bu klasör yayın hazırlığıdır; mağazaya yükleme veya onay yapıldığı anlamına gelmez. Gerçek cihaz testleri, imzalı paket ve yayıncı bilgileri tamamlanmadan yayınlama.

## Kimlik ve destek

`release.config.json` içindeki yayıncı adı, destek e-postası, gizlilik ve destek HTTPS adreslerini doldur. Ardından `npm run store:pages` çalıştır. Üretilen `store/web/privacy.html` ve `support.html` dosyalarını kontrolündeki web alanında yayınla. Bu sayfalar kayıt/giriş gerektirmeden açılmalı. İletişim bilgileri eksikken sayfalarda açık taslak uyarısı bulunur.

App kimliği `com.teknova.lenstakip`; Apple App Group `group.com.teknova.lenstakip`; widget extension `com.teknova.lenstakip.ExpoWidgetsTarget`. Mağazalarda başka bir app tarafından kullanılmadığını doğrula. İlk yayından sonra kimlikleri değiştirme.

## Derleme ve yükleme

EAS projesi @nihatkutukoglu/lens-takip hesabına bağlandı. Bu oturumda kaynakları Expo’ya yükleme girişimi otomatik onay denetimince açık aktarım izni olmadığı gerekçesiyle durduruldu; bulut derlemesi için kullanıcının açık onayı bekleniyor. Yerelde tüm Xcode/Android araçlarıyla derleme bir alternatiftir.

1. `npm ci` ve `npm run verify`.
2. `npm run release:check` — eksik yayıncı/URL alanları mağaza derlemesini durdurur.
3. `npx eas-cli build --platform android --profile preview` ile test APK’sı; aşağıdaki cihaz testlerini uygula.
4. `npx eas-cli build --platform ios --profile simulator` ile imzasız simülatör paketi; WidgetKit ve ekran kontrollerini yap.
5. Cihaz kontrolleri geçince `npx eas-cli build --platform all --profile production`.
6. Google Play için AAB, App Store Connect için imzalı IPA kullan. Android keystore’u ve Apple dağıtım imzalarını kendi geliştirici hesabında yönet; özel anahtarları kaynak ZIP’e koyma.
7. TestFlight / Play internal testing üzerinden fiziksel cihaz kabulünü tamamla. `docs/DEVICE_CHECKLIST.md` sonuçlarını tarih ve cihazla kaydet.
8. Mağaza kaydına `metadata.tr-TR.json` içindeki metinleri, canlı destek/gizlilik bağlantılarını ve gerçek ekran görüntülerini ekle. Fiyat, ülke ve yaş derecelendirmesini yayıncı hesabında belirle.
9. İlk yayın manuel olmalı. Otomatik submit veya otomatik herkese açık yayın bu projede etkin değildir.

## Gizlilik beyanı hazırlığı

Misafir kullanımında kayıtlar cihazda kalır. Hesap açan kullanıcı için Supabase Auth (Google veya e-posta/parola) ve Postgres bulut yedeği hazırlanmıştır; mağaza beyanlarında bu aktarım açıkça yer almalıdır. Araştırma paylaşımı tercihi yerel ve işlevsizdir; Lensim araştırma verisi toplamıyor/göndermiyor. Reklam SDK'sı şu an ekli değil. Widget’a yalnızca sayaç için gerekli özet aktarılır. Üretim ağ trafiği ve final paket bağımlılıkları da doğrulandıktan sonra Apple App Privacy / Google Data Safety cevaplarını son davranışa göre doldur. Yeni bir SDK eklersen beyanı tekrar incele.

Google Play Health apps declaration formunu doldur. Lens/göz bakımı ve kişisel göz günlüğü işlevlerini açıkça belirt; tıbbi cihaz veya tanı iddiası seçme. Uygulamada ve açıklamada tıbbi cihaz olmadığı ve uzman danışmanlığı gerektiği belirtilmiştir. Hedef yaş ve sağlık kategorisi yanıtlarını yayıncı doğrulamalıdır.

Apple required-reason API beyanı, UserDefaults app-group paylaşımını içerir. Final Xcode arşivinin Privacy Report’unda uygulama, SDK ve widget extension manifestlerini kontrol et. App Privacy etiketi ile API manifesti farklı kontrollerdir.

Kaynaklar (13 Kasım 2026):
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype
- https://support.google.com/googleplay/android-developer/answer/14738291?hl=en
- https://support.google.com/googleplay/android-developer/answer/18265346

## Ekran görüntüleri

Mağaza ekran görüntüleri henüz çekilmedi. Gerçek release/preview uygulamasından, kişisel veri içermeyen test kayıtlarıyla al. Tasarım maketini uygulama ekranı olarak kullanma.

Önerilen sıra: ana sayaç; takvim; isteğe bağlı özellikler; görünüm/mascot; ana ekran widget’ları. iPhone ve desteklenen iPad boyutlarını App Store Connect’teki güncel yuvalara göre hazırla; Android telefon görsellerini Play Console’da doğrula. Sistem saatini, dilini, çentik alanını ve yazı taşmalarını kontrol et. Ana sayaçta günlük/bugün/gecikmiş durumları ayrıca QA için kaydet.

## Google Play / KVKK · uygulama dışında yapılacaklar (20 Kasım 2026)

Uygulama içi taraf hazır: isteğe bağlı hesap, ayrı onaylı bulut yedeği, Hesabımı sil, Cihazımdaki tüm verileri sil, gizlilik politikası, KVKK aydınlatma metni, Hakkında (tıbbi cihaz değildir). Şunlar dışarıda yapılmalı:

1. `release.config.json` alanlarını doldur; `npm run release:check` bunlar boşken derlemeyi durdurur. `kvkkLegalBasisCloud` / `kvkkLegalBasisAccount` hukuki değerlendirmeyle yazılmalı (sağlıkla ilişkili veri, olası yurt dışı aktarım).
2. Supabase projesini kur, iki migration’ı uygula, isteğe bağlı `delete-account` fonksiyonunu yayınla (`docs/SUPABASE_SETUP.md`). Hesap silmeyi test projesinde gerçekten dene.
3. `npm run store:pages` → `store/web/privacy.html`, `kvkk.html`, `delete-account.html`, `support.html` dosyalarını HTTPS’te yayınla; adresleri config’e yaz. Play Console’daki “hesap silme URL’si” `delete-account.html` olmalı.
4. Play Console: Data safety (hesap: e-posta; isteğe bağlı bulut yedeği: sağlık ve fitness/uygulama etkinliği; şifreli aktarım; silme talebi), Health apps beyanı, gizlilik politikası URL’si. Mağaza açıklamasında tıbbi açıklama metni bulunuyor (`metadata.tr-TR.json`).
5. `SCHEDULE_EXACT_ALARM` kullanılıyor (kullanıcı ayarlı hatırlatma saatleri için, kullanıcı ayrıca izin verir). `USE_EXACT_ALARM` eklenmedi. Play’in exact alarm beyanı istenirse bu gerekçeyle doldur ya da izni kaldırıp hatırlatmaları gecikmeli kabul et.
6. Reklam SDK’sı yok. Reklam eklenecekse: sağlık verisi/kullanım sayıları reklam SDK’sına gönderilmemeli, AD_ID engeli yeniden değerlendirilmeli, AEA/BK/İsviçre için Google sertifikalı IAB TCF CMP eklenmeli, yalnızca banner ve Taktım/Takmadım/Gözlük butonlarından uzak yerleşim kullanılmalı, geliştirmede test reklam kimlikleri kullanılmalı; bütün beyanlar güncellenmeli.
