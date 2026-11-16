# Lensim

Türkçe, hesap gerektirmeyen, yerel verilerle çalışan bir iOS / Android lens değişim takipçisi. React Native + Expo SDK 58, Expo Router, SQLite, Reanimated ve gerçek native widget kaynakları içerir.

## Teslim durumu

**Yayın hazırlığı yapıldı; henüz mağazaya yüklenebilir imzalı paket ve cihaz kabulü tamamlanmadı.**

Doğrulananlar:
- Tam uygulama strict TypeScript kontrolü.
- 52 iş kuralı / SQLite testi ve 5 React Native ekran akışı testi.
- Android ve iOS Metro/Hermes üretim paketleri.
- İki platformun Expo prebuild işlemi; iOS widget bundle ve layout registry üretimi.
- Android widget tarih yardımcı sınıfı JDK 17 ile derlendi; üç saat diliminde DST, artık yıl, gecikme, gece yarısı ve geçersiz tarih kontrolleri geçti.
- SDK sürümleri hizalandı; package-lock.json oluşturuldu.
- Expo Doctor: 20 kontrolden 19’u geçti; kalan kontrol bu Mac’te CocoaPods eksikliği.
- Android yerel modül autolinking ve iOS extension kaynak referansları doğrulandı.

Ekran testleri gerçek AppProvider ve reducer ile çalışır; native veri sürücüsü, işletim sistemi bildirim/widget çağrıları ve animasyon motoru test ortamında mock edilir. Bu testler fiziksel cihaz kabulü yerine geçmez.

Kalan engeller: Bu Mac’te tam Xcode / CocoaPods yok. Yerel Gradle indirmesi Java ağ erişiminde `Operation not permitted` hatası aldı. Expo projesi hesaba bağlandı, ancak kaynakların Expo bulut derlemesine yüklenmesi otomatik onay denetimince açık aktarım izni olmadığı için durduruldu. APK/AAB/IPA henüz üretilemedi; gerçek cihaz ekranları, bildirim teslimi ve widget yenilemeleri doğrulanmadı.

`store/RELEASE.md` yayın adımlarını, `store/metadata.tr-TR.json` mağaza metinlerini içerir. `release.config.json` içindeki yayıncı, destek e-postası ve canlı HTTPS adresleri bekleniyor. `store/web/` bu bilgiler eksikken açıkça taslak olarak işaretlidir.

## Kurulum

Node.js 22.18+ veya yeni bir LTS, npm ve internete erişim gerekir. Testler Node 26.0.0 ile çalıştırıldı. Native geliştirme için platforma uygun Xcode veya Android Studio / SDK / JDK gerekir.

```sh
npm ci
npm run doctor
npm run verify
```

Bağımlılıklar kurulu Expo SDK 58’in `bundledNativeModules.json` sürümleriyle hizalanmıştır. Tekrar üretilebilir kurulum için `npm ci` kullan. SDK yükseltmelerinde `expo install --check` ve bütün doğrulamaları tekrarla.

Android development build:

```sh
npm run android
npm start
```

iOS development build (tam Xcode kurulu Mac):

```sh
npm run ios
npm start
```

İmzalama ayarlarında uygulama kimliğini ve App Group’u kendi Apple geliştirici hesabında doğrula. Varsayılanlar `com.teknova.lenstakip` ve `group.com.teknova.lenstakip`.

İsteğe bağlı EAS derlemesi:

```sh
npx eas-cli build --profile development --platform android
npx eas-cli build --profile development --platform ios
```

EAS projesi @nihatkutukoglu/lens-takip hesabına bağlıdır. İmzalama ve mağaza gönderimi yapılmadı. Backend, API anahtarı ve sunucu gerekmez. Bulut derlemesi kaynak kodunu Expo’ya aktarır; bu oturumdaki otomatik onay denetimi açık aktarım izni istedi.

**Expo Go widget testi için yeterli değildir.** Asıl ürün iOS/Android native uygulamasıdır. Yerel tarayıcı önizlemesi ayrıca mevcuttur.

## Ürün akışları

- Türkçe üç aşamalı kurulum: tanıtım → lens planı / takvim → atlanabilir bildirim izni. Kapanan yarım kurulum güvenle baştan başlar.
- Günlük, 14 günlük, takvim ayı, 30 gün ve özel gün / hafta / ay planları; manuel ilk değişim tarihi.
- Büyük gerçek sayaç, animasyonlu progress halkası, Lumi / Minti / Pufi maskotları ve durum ifadeleri.
- Lens değişim onayı, gerçek değişim tarihi, geçmiş, yeni döngü, stok hareketi; 12 saniyelik geri alma.
- Günlük lens atıldığında yeni çift kendiliğinden açılmaz. Kullanıcı yeni lens açtığını ayrıca kaydeder.
- Takvim, geçmiş, aktif tarih düzeltme ve bağlı döngüyü güncelleyen geçmiş düzeltme.
- Beş tema, açık / koyu / sistem, azaltılmış hareket, haptics seçimi.
- İsteğe bağlı sağ / sol takip, stok, solüsyon, göz günlüğü ve lens kabı.
- Bildirim izinleri, saat ve günler, OS kayıtlarıyla yeniden eşitleme; bildirim izni widget’ı etkilemez.
- Verileri silme için açık onay; modülü kapatmak verilerini silmez.

## Widget uygulamaları

### iOS

`widgets/LensCountdown.ios.tsx`, `expo-widgets` + Expo UI SwiftUI bileşenlerini kullanır. `app.config.ts` küçük / orta WidgetKit ailesini ve App Group’u tanımlar. Ana uygulama 62 günlük yerel gece yarısı timeline’ı gönderir. Son giriş sabit eski bir sayı yerine “Tarihini kontrol et” gösterir; değişim tarihi görünmeye devam eder. Uygulama açılışı, gece yarısı ve veri / tema değişimlerinde yeni timeline üretilir.

### Android

Expo SDK 58’in resmî belgesinde `updateTimeline` **yalnızca iOS** için sunuluyor. Android’de yalnızca `updateSnapshot` kullanmak uygulama kapalıyken günlük sayacı güncelleyemez. Bu nedenle Android için `modules/lens-widget` içinde yerel bir Expo modülü ve iki gerçek AppWidgetProvider yazıldı. `expo-widgets.enableAndroid` bilinçli olarak `false`; aksi halde aynı uygulamada iki farklı widget altyapısı oluşturulacaktı.

Android modülü snapshot’ı SharedPreferences’a kaydeder. Provider, date-only başlangıç / değişim tarihlerinden gün sayısını Android API 24/25 ile uyumlu `LensWidgetDates` takvim yardımcı sınıfıyla hesaplar; uygulamanın JavaScript sürecine ihtiyaç duymaz. Gece yarısı inexact AlarmManager, tarih / saat dilimi / yeniden başlatma olayları ve 30 dakikalık sistem widget güncellemesi yeniden hesaplamayı tetikler. Kesin alarm izni istenmez; Doze / üretici pil yönetimi güncellemeyi erteleyebilir. Widget bu yüzden her zaman mutlak değişim tarihini de gösterir. Dokununca `lenstakip:///` açılır.

Bu native kod henüz derlenmedi. Küçük / orta widget ekleme, gece yarısı, force-stop, yeniden başlatma, pil tasarrufu ve saat dilimi değişimi gerçek cihazda test edilmelidir.

## Veri ve iş kuralları

- Tarihler `YYYY-MM-DD`; yerel takvim parçalarıyla ayrıştırılır. UTC yalnızca iki takvim gününün ordinal farkını hesaplamak için kullanılır.
- 31 Ocak + 1 takvim ayı = Şubat sonu. Yeni döngü gerçek değişim gününe bağlanır; 28 Şubat’ta değiştirilen aylık lensin sonraki tarihi 28 Mart’tır.
- Gelecek başlangıç “başlayacak” olarak, geçmiş hedef “gün geçti” olarak sunulur.
- Tek lens stoğun temel birimidir: 1 çift = 2 lens. Sağ / sol değişiminde 1 adet düşer. Ayrı numaralar için stok v1’de ortak toplamdır; ekran bunu açıklar.
- Ayrı takip açılırken ilk sefer mevcut döngü sağ ve sola kopyalanır; tekrar açılışta eski kayıtlar korunur. Birleştirmede onayla önceki birlikte takip döngüsüne dönülür; kayıtlar silinmez ve tarih kontrolü istenir.
- SQLite WAL + exclusive transaction + revision karşılaştırması kullanılır. Döngü, stok ve geçmiş tek atomik snapshot olarak yazılır. UI işlemleri sıra ile yürütür. Başarısız transaction kutlama üretmez.
- `app_state` tablosunda sürümlü, doğrulanan JSON aggregate; `scheduled_notifications` tablosunda OS bildirim kimlikleri tutulur. Küçük kişisel veri hacminde tam atomiklik için seçildi. Çok büyük geçmişte normalize tablolara geçiş için migration gerekir.
- Widget / bildirim yan etkileri commit sonrasında çalışır. Hata ana ekranda görünür ve yeniden deneme sunulur. OS bildirimleri uygulama sahipliği etiketi ile uzlaştırılır.
- Günlük ve kişisel veriler için analitik / bulut / hesap sistemi yoktur. İşletim sistemi cihaz yedeği ayrı bir konudur.

## Dosyalar

| Konum | İçerik |
|---|---|
| `app/` | Expo Router ekranları ve dört sekme |
| `src/components/` | Ortak UI, SVG maskot, sayaç, tarih seçimi, plan formu |
| `src/domain/` | Saf tarih, döngü, stok, planlama ve doğrulama |
| `src/data/` | SQLite şema, migration, transaction ve kalıcılık |
| `src/state/` | Sıralı işlemler, state, foreground / gece yarısı yenileme |
| `src/services/` | Bildirim ve platform widget adaptörleri |
| `widgets/` | iOS WidgetKit / Expo UI widget |
| `modules/lens-widget/` | Yerel Android Expo modülü, provider ve kaynaklar |
| `assets/` | Orijinal SVG ve hazır PNG marka varlıkları |
| `tests/` | Tarih, ürün akışları ve gerçek SQLite testleri |
| `docs/DEVICE_CHECKLIST.md` | Henüz yapılmayan cihaz kabul testleri |

## Testler

```sh
npm test
npm run typecheck
node scripts/check-source.cjs
```

İş kuralı testleri Node’un yerleşik test çalıştırıcısını ve `node:sqlite` kullanır. Beş ekran akışı testi Jest Expo + React Native Testing Library ile çalışır. SQLite testleri Expo native driver’ını değil, aynı SQL şemasını ve revision sözleşmesini gerçek SQLite üzerinde doğrular. UI / native testlerinin yerini tutmaz.

İkonları tekrar üretmek istersen geliştirme ortamına `sharp` yükleyip `node scripts/generate-assets.cjs` çalıştır. Üretilmiş PNG’ler zaten projededir; normal kurulumda sharp gerekmez.

## Yayın öncesi kalan işler

1. `release.config.json`: yayıncı adı, destek e-postası, canlı gizlilik ve destek URL’leri. Ardından `npm run store:pages` ve `npm run release:check`.
2. İmzalı Android AAB / iOS IPA derlemeleri; fiziksel cihazda `docs/DEVICE_CHECKLIST.md` kabulü.
3. Gerçek cihaz ekran görüntüleri, bildirim teslimi, widget boyutları / gece yarısı / pil kısıtları, VoiceOver / TalkBack ve büyük yazı QA.
4. Mağaza sağlık / gizlilik beyanları ve yayıncı hesabı işlemleri: `store/RELEASE.md`.
5. `npm audit --omit=dev` bu kilitli ağaçta 53 orta ve 1 düşük uyarı bildirdi; yüksek/kritik yok. Kaynaklar glob/minimatch derleme-test araçları ve deepmerge; üst paketlere transitif yansıyor. Uyumsuz major override ile gizlenmedi. SDK/araç güncellemesiyle yeniden değerlendirilmelidir.
6. Dışa aktarma, iOS kilit ekranı widget’ı ve genişletilmiş istatistikler isteğe bağlı P2 kapsamındadır; v1’de yoktur.

## Doğrulanan API kaynakları

- [Expo Widgets](https://docs.expo.dev/versions/latest/sdk/widgets/) — Android timeline sınırlaması dahil.
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo Reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated/)
- [Expo Screens](https://docs.expo.dev/versions/latest/sdk/screens/)
- [Expo SVG](https://docs.expo.dev/versions/latest/sdk/svg/)

Kontrol tarihi: 13 Kasım 2026, Türkiye saati. Çalışma ortamı SDK 58 belgelerini sundu; paket kurulumu ve sürüm hizalaması tamamlandı.

## Localhost önizlemesi

`npm run web` web paketini üretip http://localhost:8081 adresinde sunar. Mac’te Watchman gerektirmez. Kod değişikliklerinin görünmesi için yeniden çalıştır. Watchman kurulu ortamda canlı yenileme için `npm run web:dev` kullanılabilir.

Web kayıtları tarayıcıdaki IndexedDB’de saklanır; mobil SQLite kayıtlarından ayrıdır. Telefon widget’ları ve yerel bildirimler web önizlemesinde çalışmaz. Bildirim ayar ekranı bu sınırı açıklar. Tarayıcıdaki onay/silme pencereleri desteklenir.

Web paketi üretildikten ve localhost sunucusu açıldıktan sonra `npm run test:web`, gerçek üretilmiş JavaScript paketlerini JSDOM içinde çalıştırarak gezinme ve IndexedDB akışlarını denetler. Bu kontrol görsel tarayıcı testi yerine geçmez. Maskotun odak durumu Expo Router’ın kendi `useIsFocused` hook’undan alınır; ayrı React Navigation bağlamı kullanılmaz.
