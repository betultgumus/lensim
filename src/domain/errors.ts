/**
 * Turns any thrown value into a short Turkish message for people. Messages written by Lensim are
 * already Turkish and are kept as they are. Native/SQLite/JS engine messages ("Error code 5:
 * database is locked", "Call to function ... has been rejected", "undefined is not an object")
 * are never shown raw: they are mapped to what happened and what the person can do next.
 */
const raw = (error: unknown) => error instanceof Error ? error.message : typeof error === 'string' ? error : '';

export function isDatabaseBusy(error: unknown): boolean {
  return /database is locked|database table is locked|SQLITE_BUSY|SQLITE_LOCKED|error code 5\b|error code 6\b/i.test(raw(error));
}
const isStorageFull = (m: string) => /SQLITE_FULL|disk is full|database or disk is full|ENOSPC|no space left/i.test(m);
const isCorrupt = (m: string) => /SQLITE_CORRUPT|malformed|not a database|SQLITE_NOTADB/i.test(m);
const isReadOnly = (m: string) => /SQLITE_READONLY|readonly database|read-only/i.test(m);
const isPermission = (m: string) => /permission|not granted|denied/i.test(m);
const isBadJson = (m: string) => /JSON|Unexpected token|Unexpected end of/i.test(m);
/** Turkish sentences from Lensim: contain Turkish letters or common Turkish words and no stack-trace markers. */
function isOwnMessage(m: string) {
  if (!m || /Error code|Exception|Call to function|rejected|undefined|null is not|is not a function|NativeDatabase|NativeStatement|SQLITE|errno|at \w+ \(/i.test(m)) return false;
  return /[çğıöşüÇĞİÖŞÜ]|\b(gir|seç|kontrol|tekrar|olmalı|bulunamadı|yok|var|lens|paket|kutu|gün|tarih)\b/i.test(m);
}

export type FriendlyError = { title: string; message: string };
export type ErrorContext = 'save' | 'load' | 'restore' | 'notification' | 'file';

export function friendlyError(error: unknown, context: ErrorContext = 'save'): FriendlyError {
  const m = raw(error);
  if (isDatabaseBusy(m)) return context === 'load'
    ? { title: 'Veriler şu an okunamadı', message: 'Telefondaki kayıt dosyası kısa süreliğine meşguldü. Kayıtların silinmedi ve değişmedi. “Yeniden dene”ye bas; sorun sürerse uygulamayı kapatıp yeniden aç.' }
    : { title: 'Kaydedilemedi', message: 'Telefondaki kayıt dosyası kısa süreliğine meşguldü, bu değişiklik kaydedilmedi. Önceki kayıtların korunuyor. Birkaç saniye sonra tekrar dene.' };
  if (isStorageFull(m)) return { title: 'Telefonda yer kalmadı', message: 'Değişiklik kaydedilemedi çünkü telefonun depolama alanı dolu. Önceki kayıtların korunuyor. Biraz yer açıp tekrar dene.' };
  if (isReadOnly(m)) return { title: 'Kaydedilemedi', message: 'Telefon şu an Lensim’in kayıt dosyasına yazmaya izin vermiyor. Önceki kayıtların korunuyor. Uygulamayı kapatıp yeniden açmayı dene.' };
  if (isCorrupt(m)) return { title: 'Kayıtlar okunamadı', message: 'Kayıt dosyası beklenen biçimde değil. Lensim hiçbir kaydı silmedi. Yedek dosyan varsa Ayarlar → Veri yedeği bölümünden geri yükleyebilirsin.' };
  if (context === 'restore' && isBadJson(m)) return { title: 'Yedek okunamadı', message: 'Seçtiğin dosya bir Lensim yedeği değil ya da eksik kaydedilmiş. Bu telefondaki kayıtların değişmedi. Lensim’den aldığın .json dosyasını seç.' };
  if (context === 'notification' && isPermission(m)) return { title: 'Bildirim izni yok', message: 'Telefonun Lensim bildirimlerine izin vermiyor. Takip çalışmaya devam eder; bildirim almak için sistem ayarlarından izni aç.' };
  if (context === 'file' && isPermission(m)) return { title: 'Dosyaya erişilemedi', message: 'Seçtiğin klasöre veya dosyaya erişim izni verilmedi. Kayıtların değişmedi. Başka bir klasör seçip tekrar dene.' };
  if (isOwnMessage(m)) return { title: context === 'load' ? 'Veriler açılamadı' : 'İşlem tamamlanamadı', message: m };
  return context === 'load'
    ? { title: 'Veriler açılamadı', message: 'Kayıtların okunurken beklenmeyen bir sorun oldu. Hiçbir kayıt silinmedi. “Yeniden dene”ye bas; sorun sürerse uygulamayı kapatıp yeniden aç.' }
    : { title: 'İşlem tamamlanamadı', message: 'Beklenmeyen bir sorun oldu ve bu değişiklik kaydedilmedi. Önceki kayıtların korunuyor. Tekrar dene; sorun sürerse uygulamayı yeniden başlat.' };
}
