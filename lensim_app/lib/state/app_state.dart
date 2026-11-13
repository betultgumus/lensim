import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart'
    show NotificationResponse;

import '../core/day.dart';
import '../data/db.dart';
import '../logic/stats.dart';
import '../models/models.dart';
import '../services/notifications.dart';

enum TodayStatus { none, worn, notWorn, mixed }

/// Ana ekrandaki bir lens kutusu: tek göz ya da birlikte açılmış iki göz.
class HomeCard {
  final List<LensPackage> packages;
  const HomeCard(this.packages);
  bool get combined => packages.length == 2;
  LensPackage get first => packages.first;
}

/// Uygulamanın tüm durumu. Veriler küçüktür; hepsi bellekte tutulur, sayılar hesaplanır.
class AppState extends ChangeNotifier {
  AppState._(this.db);

  final LensDb db;
  List<LensBox> boxes = [];
  List<LensPackage> packages = [];
  Map<int, Map<String, DayMark>> marks = {};
  Settings settings = Settings();
  Day today = Day.today();
  Set<Eye> selectedEyes = {Eye.right, Eye.left};

  Future<void> _queue = Future.value();

  static Future<AppState> load() async {
    final db = await LensDb.open();
    final s = AppState._(db);
    await Notifier.init(s._onNotification);
    await s.refresh();
    return s;
  }

  void _onNotification(NotificationResponse r) {
    applyNotificationAnswer(db, r).then((changed) {
      if (changed) refresh();
    });
  }

  /// Veriyi yeniden okur, cevapsız günleri doldurur ve bildirimleri yeniden kurar.
  /// Çağrılar sıraya girer; aynı anda iki yenileme çalışmaz.
  Future<void> refresh() {
    _queue = _queue.then((_) => _refresh()).catchError((Object e) {
      debugPrint('Lensim refresh hatası: $e');
    });
    return _queue;
  }

  Future<void> _refresh() async {
    today = Day.today();
    await _loadAll();
    if (await _autofill()) await _loadMarks();
    final ae = activeEyes;
    selectedEyes.removeWhere((e) => !ae.contains(e));
    if (selectedEyes.isEmpty) selectedEyes = {...ae};
    notifyListeners();
    await _reschedule();
  }

  Future<void> _loadAll() async {
    boxes = await db.boxes();
    packages = await db.packages();
    settings = await db.settings();
    await _loadMarks();
  }

  Future<void> _loadMarks() async {
    final all = await db.marks();
    final map = <int, Map<String, DayMark>>{};
    for (final m in all) {
      (map[m.packageId] ??= {})[m.day.key] = m;
    }
    marks = map;
  }

  /// Cevaplanmamış geçmiş günleri varsayılan cevapla ve "otomatik" işaretiyle doldurur.
  Future<bool> _autofill() async {
    final yesterday = today.addDays(-1);
    final batch = db.db.batch();
    var count = 0;
    for (final p in packages) {
      if (p.id == null) continue;
      var end = p.closedOn ?? yesterday;
      if (end.isAfter(yesterday)) end = yesterday;
      final existing = marks[p.id] ?? const <String, DayMark>{};
      for (var d = p.openedOn; !d.isAfter(end); d = d.addDays(1)) {
        if (existing.containsKey(d.key)) continue;
        batch.insert(
          'marks',
          DayMark(packageId: p.id!, day: d, worn: settings.defaultWorn, auto: true).toMap(),
        );
        count++;
      }
    }
    if (count == 0) return false;
    await batch.commit(noResult: true);
    return true;
  }

  // ---------------- Okuma ----------------

  List<LensPackage> get activePackages {
    final list = packages.where((p) => p.isActive).toList();
    list.sort((a, b) => a.eye.index.compareTo(b.eye.index));
    return list;
  }

  List<LensPackage> get closedPackages {
    final list = packages.where((p) => !p.isActive).toList();
    list.sort((a, b) => b.openedOn.compareTo(a.openedOn));
    return list;
  }

  LensPackage? activeFor(Eye e) {
    for (final p in activePackages) {
      if (p.eye == e) return p;
    }
    return null;
  }

  Set<Eye> get activeEyes => activePackages.map((p) => p.eye).toSet();

  LensPackage? packageById(int id) {
    for (final p in packages) {
      if (p.id == id) return p;
    }
    return null;
  }

  LensBox? boxById(int id) {
    for (final b in boxes) {
      if (b.id == id) return b;
    }
    return null;
  }

  Map<String, DayMark> marksOf(LensPackage p) => marks[p.id] ?? const <String, DayMark>{};

  PackageStats statsOf(LensPackage p) => PackageStats.compute(p, marksOf(p), today);

  int remainingIn(LensBox b) => boxRemaining(b, packages, marks);

  /// Bu kutudan her seferinde kaç lens çıkıyor: iki göz aynı kutuyu kullanıyorsa 2.
  int lensesPerUse(LensBox b) {
    final n = activePackages.where((p) => p.boxId == b.id).length;
    return n == 0 ? (b.eyes == 'RL' ? 2 : 1) : n;
  }

  String? boxLastsLabel(LensBox b) {
    final days = boxLastsDays(b, remainingIn(b), lensesPerUse(b));
    return days == null ? null : humanDuration(days);
  }

  /// Ana ekrandaki kutular. Aynı kutudan, aynı gün birlikte açılmış iki göz tek kutu olur.
  List<HomeCard> get homeCards {
    final act = activePackages;
    final used = <int>{};
    final cards = <HomeCard>[];
    for (final p in act) {
      if (used.contains(p.id)) continue;
      LensPackage? partner;
      if (p.groupId != null) {
        for (final q in act) {
          if (q.id != p.id &&
              q.groupId == p.groupId &&
              q.boxId == p.boxId &&
              q.openedOn == p.openedOn &&
              q.durationDays == p.durationDays) {
            partner = q;
            break;
          }
        }
      }
      used.add(p.id!);
      if (partner != null) {
        used.add(partner.id!);
        cards.add(HomeCard([p, partner]));
      } else {
        cards.add(HomeCard([p]));
      }
    }
    return cards;
  }

  /// Ortak açılmış ikinci göz (göz detayında geçiş için).
  LensPackage? partnerOf(LensPackage p) {
    if (p.groupId == null) return null;
    for (final q in packages) {
      if (q.id != p.id && q.groupId == p.groupId) return q;
    }
    return null;
  }

  List<LensPackage> get _selectedActive => activePackages
      .where((p) => selectedEyes.contains(p.eye) && !today.isBefore(p.openedOn))
      .toList();

  TodayStatus get todayStatus {
    final t = _selectedActive;
    if (t.isEmpty) return TodayStatus.none;
    final ms = t.map((p) => marksOf(p)[today.key]).toList();
    if (ms.every((m) => m != null && !m.auto && m.worn)) return TodayStatus.worn;
    if (ms.every((m) => m != null && !m.auto && !m.worn)) return TodayStatus.notWorn;
    if (ms.every((m) => m == null)) return TodayStatus.none;
    return TodayStatus.mixed;
  }

  bool isDayAnswered(Day d) {
    final act = activePackages.where((p) => !d.isBefore(p.openedOn));
    if (act.isEmpty) return true;
    return act.every((p) {
      final m = marksOf(p)[d.key];
      return m != null && !m.auto;
    });
  }

  /// Aktif paketlerde otomatik doldurulmuş günler, yeniden eskiye.
  List<Day> autoDays({int? withinDays}) {
    final from = withinDays == null ? null : today.addDays(-withinDays);
    final set = <Day>{};
    for (final p in activePackages) {
      for (final m in marksOf(p).values) {
        if (!m.auto) continue;
        if (from != null && m.day.isBefore(from)) continue;
        set.add(m.day);
      }
    }
    final list = set.toList()..sort((a, b) => b.compareTo(a));
    return list;
  }

  /// Ana ekranda otomatik gün satırı gösterilsin mi?
  bool get showAutoNotice {
    final recent = autoDays(withinDays: 7);
    if (recent.isEmpty) return false;
    return settings.autoNoticeSeen.compareTo(recent.first.key) < 0;
  }

  // ---------------- Yazma ----------------

  void toggleEye(Eye e) {
    if (selectedEyes.contains(e)) {
      if (selectedEyes.length > 1) selectedEyes.remove(e);
    } else {
      selectedEyes.add(e);
    }
    notifyListeners();
  }

  /// "Bugün taktım" / "Bugün takmadım". Aynı cevaba tekrar basmak geri alır.
  Future<void> markToday({required bool worn}) async {
    final targets = _selectedActive;
    if (targets.isEmpty) return;
    final st = todayStatus;
    final undo = (worn && st == TodayStatus.worn) || (!worn && st == TodayStatus.notWorn);
    for (final p in targets) {
      if (undo) {
        await db.deleteMark(p.id!, today);
      } else {
        await db.setMark(p.id!, today, worn: worn, auto: false);
      }
    }
    await refresh();
  }

  /// Takvimden ya da kontrol listesinden tek günü değiştirir.
  Future<bool> setDay(LensPackage p, Day d, {required bool worn}) async {
    if (d.isAfter(today) || d.isBefore(p.openedOn)) return false;
    if (p.closedOn != null && d.isAfter(p.closedOn!)) return false;
    await db.setMark(p.id!, d, worn: worn, auto: false);
    await refresh();
    return true;
  }

  /// Otomatik dolmuş bir günü, o gün otomatik olan tüm aktif paketler için cevaplar.
  Future<void> answerAutoDay(Day d, {required bool worn}) async {
    for (final p in activePackages) {
      final m = marksOf(p)[d.key];
      if (m == null || !m.auto) continue;
      await db.setMark(p.id!, d, worn: worn, auto: false);
    }
    await refresh();
  }

  Future<void> dismissAutoNotice() async {
    settings.autoNoticeSeen = today.key;
    await db.saveSettings(settings);
    notifyListeners();
  }

  /// "Yeni paket açtım". [choice]: her göz için seçilen kutu.
  /// Dönen liste: bu açılışla yedeği biten kutular.
  Future<List<LensBox>> openPackages(Map<Eye, LensBox> choice, Day openedOn) async {
    final group = choice.length == 2 ? 'g${DateTime.now().microsecondsSinceEpoch}' : null;
    for (final entry in choice.entries) {
      final prev = activeFor(entry.key);
      if (prev != null) {
        if (!prev.openedOn.isBefore(openedOn)) {
          // Aynı gün (ya da sonrasında) açılmış paket bir düzeltmedir: eskisi silinir.
          await db.deletePackage(prev.id!);
        } else {
          prev.closedOn = openedOn.addDays(-1);
          await db.updatePackage(prev);
          await db.trimMarks(prev);
        }
      }
      final box = entry.value;
      await db.insertPackage(LensPackage(
        eye: entry.key,
        boxId: box.id!,
        durationDays: box.isDaily ? 1 : box.durationDays,
        isDaily: box.isDaily,
        openedOn: openedOn,
        groupId: group,
      ));
    }
    await refresh();
    selectedEyes = activeEyes;
    notifyListeners();

    final emptied = <LensBox>[];
    for (final b in choice.values.toSet()) {
      if (!b.isDaily && remainingIn(b) == 0) emptied.add(b);
    }
    if (settings.alertStock && emptied.isNotEmpty) {
      await Notifier.showAlert(
        id: 900,
        title: 'Kutuda yedek lens kalmadı',
        body: '${emptied.first.title} kutusu bitti. Yenisini alma zamanı.',
      );
    }
    return emptied;
  }

  /// Paketi bugün itibarıyla bitirir (yeni paket açmadan).
  Future<void> finishPackage(LensPackage p) async {
    var end = today;
    if (end.isBefore(p.openedOn)) end = p.openedOn;
    p.closedOn = end;
    await db.updatePackage(p);
    await db.trimMarks(p);
    await refresh();
  }

  Future<void> editPackage(LensPackage p, {required Day openedOn, required int durationDays}) async {
    p.openedOn = openedOn;
    if (!p.isDaily) p.durationDays = durationDays;
    await db.updatePackage(p);
    await db.trimMarks(p);
    await refresh();
  }

  Future<void> deletePackage(LensPackage p) async {
    await db.deletePackage(p.id!);
    await refresh();
  }

  Future<LensBox> saveBox(LensBox b) async {
    if (b.id == null) {
      b.id = await db.insertBox(b);
    } else {
      await db.updateBox(b);
    }
    await refresh();
    return boxById(b.id!) ?? b;
  }

  Future<void> saveSettings(Settings s) async {
    settings = s;
    await db.saveSettings(s);
    await refresh();
  }

  Future<String> exportJson() async => const JsonEncoder.withIndent(' ').convert(await db.exportAll());

  Future<void> importJson(String text) async {
    final data = jsonDecode(text);
    if (data is! Map<String, dynamic>) {
      throw const FormatException('Dosya okunamadı.');
    }
    await db.importAll(data);
    await refresh();
  }

  // ---------------- Bildirimler ----------------

  Future<void> _reschedule() async {
    await Notifier.cancelAll();
    final act = activePackages;
    if (act.isEmpty) return;
    final now = DateTime.now();
    final h = settings.reminderHour;
    final m = settings.reminderMinute;

    // Günlük soru: önümüzdeki 14 gün için tek tek kurulur; bugün cevaplandıysa bugünkü atlanır.
    for (var i = 0; i < 14; i++) {
      final d = today.addDays(i);
      var at = d.at(h, m);
      if (h < dayStartHour) at = at.add(const Duration(days: 1));
      if (!at.isAfter(now)) continue;
      if (i == 0 && isDayAnswered(d)) continue;
      await Notifier.scheduleQuestion(id: 100 + i, at: at, day: d);
    }

    // Paket uyarıları: 3 gün kala ve süre dolduktan sonraki ilk gün (yalnızca bir kez).
    final seen = <String>{};
    for (final p in act) {
      if (p.isDaily || p.id == null) continue;
      final key = p.groupId == null ? 'p${p.id}' : '${p.groupId}|${p.openedOn.key}|${p.durationDays}';
      if (!seen.add(key)) continue;
      final both = p.groupId != null &&
          act.where((q) =>
                  q.groupId == p.groupId && q.openedOn == p.openedOn && q.durationDays == p.durationDays)
              .length == 2;
      final who = both ? 'Lenslerinin' : '${p.eye.label} lensinin';
      if (settings.alertThreeDays && p.durationDays > 4) {
        final at = p.openedOn.addDays(p.durationDays - 4).at(10, 0);
        if (at.isAfter(now)) {
          await Notifier.scheduleAlert(
            id: 1000 + p.id! * 2,
            at: at,
            title: '$who 3 günü kaldı',
            body: 'Yeni paketi hazırlamayı unutma.',
          );
        }
      }
      if (settings.alertExpired) {
        final at = p.openedOn.addDays(p.durationDays).at(10, 0);
        if (at.isAfter(now)) {
          await Notifier.scheduleAlert(
            id: 1001 + p.id! * 2,
            at: at,
            title: '$who süresi doldu',
            body: 'Yeni paket açtıysan uygulamaya kaydet.',
          );
        }
      }
    }
  }
}

/// Uygulamanın her yerinden duruma erişim.
class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child})
      : super(notifier: state);

  /// Dinleyerek okur: durum değişince widget yeniden çizilir.
  static AppState of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppScope>()!.notifier!;

  /// Dinlemeden okur: düğme olaylarında kullanılır.
  static AppState read(BuildContext context) =>
      context.getInheritedWidgetOfExactType<AppScope>()!.notifier!;
}
