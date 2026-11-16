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

Mevcut kaynakta hesap, analytics, reklam, bulut eşitlemesi, uzaktan push token kaydı ve ödeme yok. Lens/sağlık notları cihazda işlenir; widget’a yalnızca sayaç için gerekli özet aktarılır. Üretim ağ trafiği ve final paket bağımlılıkları da doğrulandıktan sonra Apple App Privacy / Google Data Safety cevaplarını bu davranışa göre doldur. Yeni bir SDK eklersen beyanı tekrar incele. Destek için kullanıcı tarafından gönderilen e-postaları kendi destek sürecinde değerlendir.

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
