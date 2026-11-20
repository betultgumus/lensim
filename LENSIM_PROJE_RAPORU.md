# Lensim — Proje Durumu ve Yol Haritası

**Rapor tarihi:** 18 Kasım 2026  
**Amaç:** Bu belge, Lensim projesini başka bir sohbete aktarırken ürünün amacını, mevcut kapsamı, kaynaklarda tamamlanmış görünen işleri ve kalan planları tek yerde açıklamak için hazırlandı.

> **Durum okuma notu:** Bu rapor çalışma alanındaki README, v1 uygulama durumu, tasarım notları, mağaza hazırlık belgeleri ve kaynak kod yapısına dayanır. “Uygulandı” ifadesi kod/doküman durumunu anlatır; ilgili gerçek cihaz veya mağaza kabulünün yapıldığını tek başına kanıtlamaz. Özellikle cihaz testleri, imzalı mağaza derlemesi ve yayın henüz tamamlanmış sayılmıyor.

## 1. Proje özeti

Lensim, kontakt lens kullanan kişinin lens paketlerini, kullanım/değişim süresini, günlük takma durumunu, stoklarını ve geçmişini takip etmesine yardımcı olan kişisel bir uygulamadır. Temel amaç; hangi gözde hangi lensin açık olduğunu, ne zaman değişmesi gerektiğini ve gün içinde lens takılıp takılmadığını kolayca görmektir. Uygulama bir tıbbi cihaz değildir; teşhis veya tedavi sunmaz.

Ürün yaklaşımının ana ilkeleri:

- V1’de hesap olmadan, cihaz üzerinde çalışmak. Sonraki aşama için giriş ekleme kararı alındı; girişin bulut yedeği/eşitleme sağlayıp sağlamayacağı henüz belirlenmedi.
- Sağ ve sol gözü ayrı izlemeyi desteklemek; günlük kullanım cevabını pratik biçimde iki göze birlikte kaydedebilmek.
- Gözlükle geçirilen günü, lens takılan günden ayırmak ve takvim geçmişini düzeltilebilir tutmak.
- Kullanıcıya süre, kalan lens stoğu ve gecikme durumunu anlaşılır biçimde göstermek.
- Günlük hatırlatmaları ve değişim uyarılarını cihazın yerel bildirimleriyle sunmak.
- Verileri kullanıcının cihazında tutmak ve taşınabilir dosya yedeği sağlamak.

## 2. Uygulama ve kaynak kodun mevcut yapısı

Güncel ve yayın hattı olarak **Expo / React Native** seçildi. Android, iOS ve web önizlemesi hedefleniyor. Eski, ayrı Flutter uygulaması kaldırıldı; Expo uygulamasının dosyalarına ve çalışma akışına dokunulmadı. Native sürümde SQLite, web önizlemesinde tarayıcı IndexedDB kullanılıyor.

## 3. Bugüne kadar tamamlananlar

### 3.1 Ürün akışı ve başlangıç kurulumu

- İlk açılışta hesap/giriş ekranı olmadan lens kurulumu başlıyor.
- İlk paket oluşturma akışında göz seçimi, lens türü, isteğe bağlı reçete değerleri, kullanım süresi, kutu stoğu ve istenirse geçmiş bir açılış tarihi girilebiliyor.
- Kullanıcıdan reçete girmesi zorunlu tutulmuyor.
- Paket/kutu, sağ-sol göz ve kullanım döngüsü kavramlarını taşıyan temel ürün modeli oluşturulmuş.

### 3.2 Lens paketleri, süre ve stok davranışı

- Aylık veya farklı süreli tekrar kullanılabilir lens paketinde paket açılırken her seçili göz için bir yedek lens stoktan düşüyor.
- Günlük lenste stok, yalnızca lens takıldı olarak kaydedilen günlerde azalıyor.
- Gün kaydı sonradan düzeltilirse günlük lens stoğu da buna göre geri hesaplanıyor.
- Kutu stoku ve lens paketleri yönetimi için ekranlar bulunuyor; v1 dokümanında yeni kutu yönetimi ayrıca takip işi olarak işaretlendiği için kapsamın tüm kenar durumlarının bitmiş olduğu varsayılmamalı.
- Paket ayrıntısı, takvim üzerinden seçilen günü düzeltme ve kapatılmış paketleri geçmişte görme akışları tanımlanmış.

### 3.3 Günlük takip, takvim ve geçmiş

- Ana ekranda etkin paketler gösteriliyor; iki göz aynı anda açılmışsa tek bir ortak paket olarak sunulabiliyor.
- Tek dokunuşla günlük kullanım kaydı ve “Taktım / Takmadım” bildirim eylemleri mevcut.
- Takip günü saat 02.00’de değişiyor; ana ekran ve eksik günleri tamamlama mantığında aynı sınır kullanılıyor.
- Kaçırılan günler varsayılan seçime göre otomatik doldurulabiliyor ve otomatik doldurma olduğu geçmişte belli oluyor.
- Otomatik doldurulan gün takvimden elle düzeltilebiliyor.
- Geçmiş ekranı otomatik kayıtları ve kapanmış paketleri göstermek üzere eklenmiş.
- Süresi geçen paket/overdue durumu ana ekranda görünür kılınmış.

### 3.4 Veri saklama, gizlilik ve yedek

- Expo native uygulamasında SQLite, web önizlemesinde IndexedDB kullanımı belgelenmiş.
- V1’de hesap, bulut yedekleme/eşitleme ve uzaktan push token kaydı yok. Giriş sonraki aşama olarak kararlaştırıldı; kimlik sağlayıcısı ve lens/reçete verisinin buluta taşınıp taşınmayacağı açık karar bekliyor.
- Sağlıkla ilişkili lens/reçete kayıtlarının cihaz üzerinde tutulması ürün kuralı olarak belgelenmiş.
- JSON yedek dışa aktarma ve geri yükleme ekranı bulunuyor. Geri yükleme tüm durum doğrulandıktan sonra kayıtları değiştirecek şekilde tasarlanmış; web dışa aktarması dosya indiriyor.
- Gizlilik ayarları ve veri yönetimi ekranları mevcut kaynak yapısında yer alıyor.
- Kaynakta geçmiş döngü kayıtlarının paket geçmişine taşınmasına yönelik veri geçişi belirtilmiş.

### 3.5 Bildirim ve hatırlatmalar

- Günlük yerel hatırlatma ve lens kullanım süresine göre yaklaşan/sona eren paket uyarıları planlanmış.
- Bildirimler cihazda oluşturulur; bulut push servisi kullanılmaz.
- Android/iOS bildirim eylemlerinin uygulama kapalıyken, zorla durdurulduktan sonra veya yeniden başlatma sonrasında güvenilirliğinin fiziksel cihazda doğrulanması hâlâ açık iş.

### 3.6 Arayüz ve tasarım yönü

- Büyük metin ve dokunma alanları, sade renk kullanımı ve temel ortak tasarım sistemi geliştirilmiş.
- Ana ekran, takvim, paket/kutu düzenleme, reçete, ayarlar, gizlilik ve yedekleme ekranları kaynakta mevcut.
- Tasarım notları reçete alanlarının daha anlaşılır olması, isteğe bağlılığın ilk bakışta anlatılması, sağ-sol seçimlerinin belirginleştirilmesi ve mobilde okunabilirlik için ayrıntılı yön veriyor.
- Mağaza metadatasında temalar, açık/koyu görünüm, azaltılmış hareket, maskotlar ve isteğe bağlı takip modülleri anlatılıyor. Bu mağaza metni, her unsurun mevcut kaynakta cihaz kabulünden geçtiğinin kanıtı değildir; yayından önce özellik-parite kontrolü gerekir.

### 3.7 Kalite ve otomasyon altyapısı

Depoda tip kontrolü, birim/akış/görsel testleri, web smoke testi, gizlilik/offline ve yayın kontrol betikleri tanımlı. Cihaz kontrol listesinde `typecheck`, 75 test, 4 UI akışı ve web smoke testi başarılı işaretlenmiş. Bu işaretler dokümandaki önceki kayıt durumudur; bu rapor hazırlanırken yeniden çalıştırılmış test sonucu değildir.

## 4. Tamamlanmamış işler ve yayın engelleri

### Öncelik 1 — Yayınlanacak uygulama hattını kesinleştirme

- Expo / React Native artık tek seçili uygulama hattı; Flutter kaynakları kaldırıldı.
- Giriş sonraki aşama olarak kararlaştırıldı. Hesabın amacı (cihazlar arası eşitleme, bulut yedeği veya yalnızca hesapla erişim), saklanacak veri ve hesap silme/yerel kullanım davranışı belirlenmeli.

### Öncelik 2 — Gerçek cihaz kabul testleri

`docs/DEVICE_CHECKLIST.md` kapsamındaki Android testleri henüz tamamlanmış değil. Özellikle:

- İlk kurulum, bildirim iznini reddetme ve geçmiş tarihli paket açma.
- Günlük takma/takmama/gözlük kaydı, 02.00 gün sınırı, takvim düzeltmesi ve otomatik günlerin davranışı.
- Ayrı göz/kutu, geriye dönük paket açma/silme, stok iadesi ve reçete girişi.
- JSON yedeğin başka cihazda geri yüklenmesi, bozuk dosyanın reddi ve önceki veriye dönüş.
- Bildirimin uygulama kapalıyken ve cihaz yeniden başladıktan sonra ulaşması; Android üreticilerinin pil kısıtları.
- Farklı ekran genişliği, büyük yazı, ekran okuyucu ve kalıcılık kontrolleri.

Expo bildirim aksiyonlarının uygulama işlemi yokken kaydı güvenilir biçimde veritabanına yazdığı da kabul edilmelidir.

### Öncelik 3 — Ana ekran widget’ı

Mevcut native widget altyapısının eski döngü verisini kullandığı ve yeni Lensim paket görünümünü henüz sağlamadığı belirtilmiş. Paket bazlı doğru sayaç/widget görünümü ile widget üzerinden “Taktım” eylemi geliştirilip cihazda doğrulanmalı. Widget için App Group ve extension kimlikleri release dokümanında belirtiliyor; son derlemede eşleşme kontrolü gerekir.

### Öncelik 4 — Reçete ve çoklu göz/kutu senaryoları

- Sağ ve sol gözün reçetesi/markası/paketi/takvimi ayrı yönetimi tam doğrulanmalı.
- Kullanıcıya iki gözün değerlerinin aynı olup olmadığını soran ortak/ayrı reçete akışı ürün fikri olarak yazılmış; uygulanmış özellik gibi sayılmamalı.
- Reçete ekranının mobil yerleşimi, segmentli seçimleri, isteğe bağlı alan açıklamaları ve gelişmiş lens değerleri için tasarım notları uygulanmalı.
- Paket açılışları aynı tarihteyse iki gözün geçen gün sayacının eşit olması sağlanmalı; günlük kullanım cevabı iki göz için ortak kalmalı.

### Öncelik 5 — Platform ve dil kapsamı

- Native tam yedek dosyası seçme/geri yükleme akışı tamamlanıp cihazda denenmeli.
- İngilizce arayüz henüz takip işi olarak listelenmiş; mağaza metadatası Türkçe.
- iOS fiziksel cihaz ve widget kabulü tamamlanmalı. iOS mağaza yayını için imzalı IPA gerekecek.
- iOS fiziksel cihaz ve widget kabulü tamamlanmalı.

### Öncelik 6 — Mağazaya hazırlık ve yayın

- Yayıncı adı, destek e-postası, canlı gizlilik ve destek URL’leri `release.config.json` içinde boş; bu alanlar doldurulmadan yayın kontrolü geçmez.
- Mağaza gizlilik/destek sayfaları üretilmeli, gerçek web alanında yayımlanmalı ve kayıt istemeden açıldığı doğrulanmalı.
- İmzalı Android APK/AAB ve iOS IPA henüz oluşturulmuş değil. Android yayın anahtarı ve Apple imzalama kendi yayıncı hesabında güvenli biçimde yönetilmeli.
- Gerçek uygulamadan kişisel veri içermeyen mağaza ekran görüntüleri henüz alınmamış.
- Google Play Data Safety/sağlık beyanı, Apple App Privacy ve required-reason API beyanı son derleme ve bağımlılıklar üzerinden doğrulanmalı.
- TestFlight ve Play dahili testinde fiziksel cihaz kabulü tamamlanmalı; sonra mağaza metni, ülke/fiyat/yaş derecelendirmesi ve ilk manuel yayın kararı verilmeli.
- EAS bulut derlemesi için geçmişte yükleme girişimi otomatik onay denetimince durdurulmuş; EAS yerine uygun yerel derleme seçeneği de belgelenmiş. Bu nedenle bulut derleme/yayın tamamlanmış değildir.

## 5. Gelecek ürün fikirleri

### V1 kapsamının dışındaki fikirler

- Lens paket döngüsüne bağlı otomatik lens sipariş aboneliği. Ancak ülke ve tedarikçi kapsamı, fiyat, yasal yükümlülükler ve açık kullanıcı onayı araştırıldıktan sonra ayrı bir ürün kararı olmalı. Bu fikir mevcut v1 teslim kapsamına dahil değil.
- İki göz için ortak reçete girişi veya farklı reçete/marka/paket seçimi. Aynı değerler paylaşıldığında ortak kurulum; farklıysa göz başına ayrı kurulum gösterilmesi öneriliyor.

## 6. Önerilen tamamlanma sırası

1. **Giriş ve veri mimarisi kararı:** Hesabın amacı, bulut eşitlemesinin kapsamı, yerel kullanım ve hesap silme davranışı; kimlik/veritabanı sağlayıcısı.
2. **V1 kapsamını dondurma:** Sağ/sol ve reçete senaryoları, kutu yönetimi, yedek/geri yükleme, bildirim ve widget için kabul kriterleri yazma.
3. **Eksik özellikleri kapatma:** Öncelikle doğru paket verisi kullanan widget, native yedek geri yükleme, göz/reçete akışları ve platform farkları.
4. **Otomatik doğrulama:** Kaydedilmiş testleri ve yayın kontrolünü seçilen hattın temiz checkout’unda çalıştırıp sonuçları güncelleme.
5. **Cihaz kabulü:** Android fiziksel cihaz; ardından iOS cihaz/simülatör ve widget; checklist sonuçlarını cihaz/tarih ile kaydetme.
6. **Gizlilik ve mağaza hazırlığı:** Publisher alanları, web sayfaları, veri beyanları, metinler ve gerçek ekran görüntüleri.
7. **İmzalı test derlemeleri:** Play dahili test ve TestFlight; bulgu varsa düzeltip yeniden kabul.
8. **İlk manuel yayın:** Mağaza onayı, destek süreci ve sonraki sürüm planı.

## 7. Başka sohbete verilecek kısa proje özeti

> Lensim, kontakt lens kullanımını, değişim süresini, sağ/sol göz paketlerini, günlük takma geçmişini ve stokları takip eden Expo/React Native uygulamasıdır. V1’de native veriler SQLite’ta, web önizlemesi IndexedDB’de yerel tutulur; giriş sonraki aşama olarak kararlaştırılmıştır. Hesabın bulut yedeği/eşitleme sağlayıp sağlamayacağı, veritabanı sağlayıcısı ve veri güvenliği kuralları henüz belirlenmemiştir. İlk kurulum, paket ve günlük takip, 02.00 gün sınırı, takvim/geçmiş, yerel bildirim altyapısı ve JSON yedekleme geliştirilmiş; native geri yükleme, cihaz kabulü, mağaza derlemeleri ve yayın işleri sürmektedir.

## 8. Bu raporda başvurulan proje belgeleri

- `README.md` — Expo uygulamasını çalıştırma.
- `lens-takip/docs/LENSIM-V1-IMPLEMENTATION.md` — v1’de uygulananlar, gizlilik kuralı, açık işler ve gelecek fikirleri.
- `lens-takip/docs/UI_UX_REDESIGN_NOTES.md` — reçete ve arayüz için takip notları.
- `lens-takip/docs/DEVICE_CHECKLIST.md` — cihaz kabul senaryoları ve önceki test kapısı kayıtları.
- `lens-takip/store/RELEASE.md` — derleme, imza, gizlilik ve yayın adımları.
- `lens-takip/store/metadata.tr-TR.json` ve `lens-takip/release.config.json` — mağaza metni ve henüz doldurulmamış yayıncı alanları.
