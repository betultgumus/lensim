import '../core/day.dart';
import '../models/models.dart';

/// Bir paketin ekranda gösterilen sayıları. Hiçbiri saklanmaz; her seferinde hesaplanır.
class PackageStats {
  /// Açılıştan bugüne (ya da kapanışa) kaç gün geçti, açılış günü dahil.
  final int openDays;

  /// "Taktım" işaretli günler (otomatik dolanlar dahil).
  final int wornDays;

  /// Süre − açık gün. Negatifse süre dolmuştur.
  final int remaining;

  /// Bu ay (bugünün ayı) takılan gün; günlük lenste büyük sayı.
  final int wornThisMonth;

  /// Otomatik doldurulmuş gün sayısı.
  final int autoDays;

  const PackageStats({
    required this.openDays,
    required this.wornDays,
    required this.remaining,
    required this.wornThisMonth,
    required this.autoDays,
  });

  bool get isLastDay => remaining == 0;
  bool get expired => remaining < 0;
  int get overdue => remaining < 0 ? -remaining : 0;

  static PackageStats compute(LensPackage p, Map<String, DayMark> marks, Day today) {
    final end = p.closedOn ?? today;
    final openDays = end.diff(p.openedOn) + 1;
    var worn = 0;
    var month = 0;
    var auto = 0;
    for (final m in marks.values) {
      if (m.day.isBefore(p.openedOn) || m.day.isAfter(end)) continue;
      if (m.auto) auto++;
      if (!m.worn) continue;
      worn++;
      if (m.day.sameMonth(today)) month++;
    }
    return PackageStats(
      openDays: openDays < 1 ? 1 : openDays,
      wornDays: worn,
      remaining: p.isDaily ? 0 : p.durationDays - openDays,
      wornThisMonth: month,
      autoDays: auto,
    );
  }
}

/// Kutuda kalan lens: toplam − (açılan süreli paket sayısı) − (günlük lenste takılan gün).
int boxRemaining(LensBox box, Iterable<LensPackage> packages, Map<int, Map<String, DayMark>> marks) {
  var used = 0;
  for (final p in packages) {
    if (p.boxId != box.id) continue;
    if (p.isDaily) {
      final m = marks[p.id] ?? const {};
      used += m.values.where((x) => x.worn).length;
    } else {
      used += 1;
    }
  }
  final left = box.totalLenses - used;
  return left < 0 ? 0 : left;
}

/// Kalan yedeğin yaklaşık kaç gün yeteceği.
/// [lensesPerOpening]: aynı kutudan her seferinde kaç lens çıkıyor (iki göz aynı kutudaysa 2).
int? boxLastsDays(LensBox box, int remaining, int lensesPerOpening) {
  if (remaining <= 0 || lensesPerOpening <= 0) return null;
  if (box.isDaily) return remaining ~/ lensesPerOpening;
  return (remaining ~/ lensesPerOpening) * box.durationDays;
}

/// Yaklaşık süreyi okunur yazar: "19 gün", "2 ay", "1 yıl".
String humanDuration(int days) {
  if (days < 45) return '$days gün';
  if (days < 365) return '${(days / 30).round()} ay';
  final y = days / 365;
  return y < 1.5 ? '1 yıl' : '${y.round()} yıl';
}
