# Lensim 1.0

Kontakt lens kullanım günlerini sayan, internetsiz çalışan Flutter uygulaması.
Kurallar: "Lensim — Uygulama Kuralları" dokümanı. Tasarım: "Lensim – Tema ve Logo Yönleri" kanvasındaki v3 ekranlar.

## APK'yı almanın en kolay yolu (bilgisayara hiçbir şey kurmadan)

1. github.com'da yeni bir depo aç (özel olabilir), örn. `lensim`.
2. Bu klasördeki her şeyi depoya yükle (`.github` klasörü dahil). Web sitesindeki "Add file › Upload files" yeterli.
3. Depoda **Actions** sekmesine gir. "APK derle" işi kendiliğinden başlar (yaklaşık 8–12 dakika).
4. İş bitince işin sayfasının altındaki **Artifacts › lensim-apk** dosyasını indir, içindeki `app-release.apk`'yı telefona at ve kur
   (Android "bilinmeyen kaynaklara izin ver" diye sorabilir).

Her yeni yüklemede APK yeniden derlenir. Derleme hattı önce kural testlerini çalıştırır; bir kural bozulursa APK üretilmez.

## Kendi bilgisayarında derlemek istersen

Flutter 3.35 ve Android Studio kurulu olmalı.

```bash
flutter create --platforms=android --org com.lensim --project-name lensim .
rm -f test/widget_test.dart
python3 tool/patch_android.py
flutter pub get
dart run flutter_launcher_icons
flutter test
flutter run            # bağlı telefonda dener
flutter build apk      # build/app/outputs/flutter-apk/app-release.apk
```

## Kod düzeni

| Klasör | İçerik |
| --- | --- |
| `lib/core/day.dart` | Gün hesabı. Gün 02:00'de başlar. Türkçe ay ve gün adları |
| `lib/models/` | Kutu, paket, gün kaydı, ayarlar |
| `lib/data/db.dart` | Telefondaki SQLite veritabanı, dosya yedeği |
| `lib/logic/stats.dart` | Açık gün, takılan gün, kalan gün, kutuda kalan lens hesapları |
| `lib/state/app_state.dart` | Otomatik doldurma, işaretleme, paket açma, bildirim zamanlama |
| `lib/services/notifications.dart` | "Taktım / Takmadım" düğmeli günlük bildirim, süre uyarıları |
| `lib/ui/` | Bugün, lens kutusu kartı, göz detayı (takvim), yeni paket, kutu formu, Geçmiş, Ayarlar |
| `test/rules_test.dart` | Kural dokümanındaki örneklerin testleri (17 / 11 / 13 gibi) |
| `tool/patch_android.py` | Bildirim izinleri ve Android ayarları |
| `tool/make_icons.py` | Uygulama ikonunu üretir |

## 1.0'da olanlar

- Hesapsız kullanım; tüm veri telefonda. Dosyaya yedek alma ve geri yükleme.
- Kutu ekleme: kullanım süresi, lens tipi (küresel, torik/astigmat, multifokal, renkli) ve numara, lens sayısı, göz.
- Yeni paket açma: sağ, sol ya da iki göz. Aynı numaralı kutudan iki lens düşer.
- Kalan süre açılış gününden sayılır; takılan gün ayrıca gösterilir.
- Cevaplanmayan gün gece 02:00'de varsayılan cevapla dolar ve takvimde turuncu görünür. Takvimden düzeltilebilir.
- Günlük lenste büyük sayı bu ay takılan gün; her takılan gün kutudan lens düşer.
- Her gün seçilen saatte "Taktım / Takmadım" bildirimi; o gün zaten işaretlendiyse gönderilmez.
- Süre bitmeden 3 gün önce ve süre dolunca (bir kez) uyarı. Süresi dolan lensin kutusu kırmızı ışıkla yanar.
- Açık / koyu tema.

## Sonraki sürümler

- 1.1: ana ekran widget'ı, Play Store imzalama anahtarı. Hesap, bulut eşitlemesi veya otomatik bulut yedeği planlanmıyor.
- 1.2: iPhone sürümü, İngilizce, istatistik.

## Notlar

- Yazı tipleri (Archivo, IBM Plex Mono) ilk açılışta internetten bir kez indirilip saklanır. İnternet yoksa telefonun kendi yazı tipi kullanılır.
- APK şimdilik geliştirici anahtarıyla imzalı; kendi telefonuna kurmak için uygundur. Play Store'a yüklemeden önce kalıcı bir imza anahtarı oluşturulmalı.
