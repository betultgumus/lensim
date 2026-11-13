/// Lensim'de bir "gün" telefonun saatiyle 02:00'de başlar.
/// Gece 01:00'de lensini çıkaran kişi hâlâ bir önceki gün için işaretleme yapar.
const int dayStartHour = 2;

/// Saat bilgisi olmayan takvim günü. Veritabanında 'YYYY-MM-DD' olarak saklanır.
class Day implements Comparable<Day> {
  final int year;
  final int month;
  final int day;

  const Day(this.year, this.month, this.day);

  /// Bir takvim tarihini (saatsiz) güne çevirir.
  factory Day.fromDate(DateTime d) => Day(d.year, d.month, d.day);

  /// Bir anın hangi Lensim gününe düştüğünü bulur (02:00 sınırı).
  factory Day.of(DateTime moment) =>
      Day.fromDate(moment.subtract(const Duration(hours: dayStartHour)));

  /// Şu anki Lensim günü.
  factory Day.today() => Day.of(DateTime.now());

  factory Day.parse(String s) {
    final p = s.split('-');
    return Day(int.parse(p[0]), int.parse(p[1]), int.parse(p[2]));
  }

  DateTime get _utc => DateTime.utc(year, month, day);

  Day addDays(int n) {
    final d = _utc.add(Duration(days: n));
    return Day(d.year, d.month, d.day);
  }

  /// this − other, gün olarak.
  int diff(Day other) => _utc.difference(other._utc).inDays;

  /// 1 = Pazartesi … 7 = Pazar
  int get weekday => _utc.weekday;

  Day get firstOfMonth => Day(year, month, 1);

  int get daysInMonth => DateTime.utc(year, month + 1, 0).day;

  bool sameMonth(Day o) => o.year == year && o.month == month;

  /// Bu günün belirtilen saatteki yerel zamanı.
  DateTime at(int hour, int minute) => DateTime(year, month, day, hour, minute);

  String get key =>
      '${year.toString().padLeft(4, '0')}-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';

  bool isBefore(Day o) => compareTo(o) < 0;
  bool isAfter(Day o) => compareTo(o) > 0;

  @override
  int compareTo(Day other) => key.compareTo(other.key);

  @override
  bool operator ==(Object other) => other is Day && other.key == key;

  @override
  int get hashCode => key.hashCode;

  @override
  String toString() => key;
}

const List<String> trMonths = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const List<String> trWeekdays = [
  'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar',
];

const List<String> trWeekdaysShort = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

String trUpper(String s) => s.replaceAll('i', 'İ').replaceAll('ı', 'I').toUpperCase();

/// "13 Kasım"
String dayMonth(Day d) => '${d.day} ${trMonths[d.month - 1]}';

/// "13 Kasım Cuma"
String dayMonthWeekday(Day d) => '${dayMonth(d)} ${trWeekdays[d.weekday - 1]}';

/// "Kasım 2026"
String monthYear(Day d) => '${trMonths[d.month - 1]} ${d.year}';

/// "13.11.2026"
String dotted(Day d) =>
    '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';

/// "13.11"
String dottedShort(Day d) =>
    '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}';
