import 'package:flutter_test/flutter_test.dart';
import 'package:lensim/core/day.dart';
import 'package:lensim/logic/stats.dart';
import 'package:lensim/models/models.dart';

void main() {
  group('Gün sınırı 02:00', () {
    test('01:30 bir önceki güne sayılır', () {
      expect(Day.of(DateTime(2026, 11, 13, 1, 30)).key, '2026-11-12');
    });
    test('02:00 yeni gündür', () {
      expect(Day.of(DateTime(2026, 11, 13, 2, 0)).key, '2026-11-13');
    });
    test('gün farkı ve ekleme', () {
      const a = Day(2026, 10, 28);
      expect(a.addDays(16).key, '2026-11-13');
      expect(const Day(2026, 11, 13).diff(a), 16);
      expect(const Day(2026, 11, 1).weekday, 7); // 1 Kasım 2026 Pazar
    });
  });

  group('Sayaç: kalan süre açılıştan sayılır', () {
    // Kural dokümanındaki örnek: 30 günlük lens, 17 gündür açık, 11 gün takılmış → 13 gün kaldı.
    final p = LensPackage(
      id: 1,
      eye: Eye.right,
      boxId: 1,
      durationDays: 30,
      isDaily: false,
      openedOn: const Day(2026, 10, 28),
    );
    const today = Day(2026, 11, 13);
    const pattern = 'WWNWNWWNAWNNWANWW'; // 17 gün: W taktım, N takmadım, A otomatik taktım
    final marks = <String, DayMark>{};
    for (var i = 0; i < pattern.length; i++) {
      final d = p.openedOn.addDays(i);
      final ch = pattern[i];
      marks[d.key] = DayMark(packageId: 1, day: d, worn: ch != 'N', auto: ch == 'A');
    }

    test('17 / 11 / 13', () {
      final st = PackageStats.compute(p, marks, today);
      expect(st.openDays, 17);
      expect(st.wornDays, 11);
      expect(st.remaining, 13);
      expect(st.expired, isFalse);
      expect(st.autoDays, 2);
    });

    test('31. gün süre dolmuş sayılır', () {
      final st = PackageStats.compute(p, marks, const Day(2026, 11, 27));
      expect(st.openDays, 31);
      expect(st.expired, isTrue);
      expect(st.overdue, 1);
    });

    test('30. gün son gündür', () {
      final st = PackageStats.compute(p, marks, const Day(2026, 11, 26));
      expect(st.isLastDay, isTrue);
    });
  });

  group('Kutu ve yedek', () {
    test('iki göz aynı numara: 6 lensli kutu, her açılışta 2 düşer, 3 ay yeter', () {
      final box = LensBox(
        id: 7,
        plan: WearPlan.monthly,
        durationDays: 30,
        kind: LensKind.spherical,
        totalLenses: 6,
        eyes: 'RL',
        createdOn: const Day(2026, 11, 1),
      );
      final pk = [
        LensPackage(id: 1, eye: Eye.right, boxId: 7, durationDays: 30, isDaily: false, openedOn: const Day(2026, 11, 1)),
        LensPackage(id: 2, eye: Eye.left, boxId: 7, durationDays: 30, isDaily: false, openedOn: const Day(2026, 11, 1)),
      ];
      final left = boxRemaining(box, pk, {});
      expect(left, 4);
      expect(boxLastsDays(box, left, 2), 60);
      expect(boxLastsDays(box, 6, 2), 90);
    });

    test('günlük lens: takılan her gün kutudan düşer', () {
      final box = LensBox(
        id: 3,
        plan: WearPlan.daily,
        durationDays: 1,
        kind: LensKind.spherical,
        totalLenses: 30,
        eyes: 'R',
        createdOn: const Day(2026, 11, 1),
      );
      final p = LensPackage(id: 9, eye: Eye.right, boxId: 3, durationDays: 1, isDaily: true, openedOn: const Day(2026, 11, 1));
      final m = <int, Map<String, DayMark>>{
        9: {
          for (var i = 0; i < 5; i++)
            const Day(2026, 11, 1).addDays(i).key:
                DayMark(packageId: 9, day: const Day(2026, 11, 1).addDays(i), worn: i != 2, auto: false),
        },
      };
      expect(boxRemaining(box, [p], m), 26);
    });
  });

  test('Türkçe büyük harf', () {
    expect(trUpper('Cum 13 Kasım'), 'CUM 13 KASIM');
    expect(trUpper('salı'), 'SALI');
  });
}
