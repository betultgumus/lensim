import 'package:flutter/material.dart';

import '../core/day.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import 'auto_days_sheet.dart';
import 'lens_box_card.dart';
import 'new_package_screen.dart';
import 'theme.dart';
import 'widgets.dart';

/// Bugün ekranı: yalnızca şu anki paket(ler). Geçmiş bilgisi burada asla yok.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    if (s.activePackages.isEmpty) return const _EmptyHome();
    final cards = s.homeCards;
    final d = s.today;

    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
              children: [
                Row(
                  children: [
                    const Wordmark(),
                    const Spacer(),
                    Text(
                      trUpper('${trWeekdaysShort[d.weekday - 1]} ${d.day} ${trMonths[d.month - 1]}'),
                      style: LensType.mono(size: 14, color: c.muted),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                _CardsLayout(cards: cards),
                if (s.showAutoNotice) ...[
                  const SizedBox(height: 16),
                  const _AutoNotice(),
                ],
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(24, 0, 24, 8),
            child: _TodayActions(),
          ),
        ],
      ),
    );
  }
}

class _CardsLayout extends StatelessWidget {
  const _CardsLayout({required this.cards});
  final List<HomeCard> cards;

  @override
  Widget build(BuildContext context) {
    final sideBySide = cards.length == 2 && !cards[0].combined && !cards[1].combined &&
        !cards[0].first.isDaily && !cards[1].first.isDaily;
    if (sideBySide) {
      return IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(child: LensBoxCard(card: cards[0], compact: true)),
            const SizedBox(width: 12),
            Expanded(child: LensBoxCard(card: cards[1], compact: true)),
          ],
        ),
      );
    }
    return Column(
      children: [
        for (var i = 0; i < cards.length; i++) ...[
          if (i > 0) const SizedBox(height: 14),
          LensBoxCard(card: cards[i]),
        ],
      ],
    );
  }
}

class _AutoNotice extends StatelessWidget {
  const _AutoNotice();

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final days = s.autoDays(withinDays: 7);
    final onlyYesterday = days.length == 1 && days.first == s.today.addDays(-1);
    final answer = s.settings.defaultWorn ? 'taktım' : 'takmadım';
    final text = onlyYesterday
        ? 'Dün cevap vermedin, $answer sayıldı.'
        : '${days.length} gün otomatik dolduruldu.';
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 6, 4, 6),
      decoration: BoxDecoration(
        color: c.amberBg,
        border: Border.all(color: c.amberLine),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(color: c.amber, shape: BoxShape.circle)),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: LensType.text(size: 15, color: c.amberInk, height: 1.3))),
          TextButton(
            onPressed: () => showAutoDaysSheet(context),
            style: TextButton.styleFrom(minimumSize: const Size(48, 44), foregroundColor: c.amberInk),
            child: Text(onlyYesterday ? 'Düzelt' : 'Kontrol et',
                style: LensType.text(size: 15, weight: FontWeight.w700, color: c.amberInk)),
          ),
          IconButton(
            tooltip: 'Kapat',
            onPressed: () => AppScope.read(context).dismissAutoNotice(),
            icon: Icon(Icons.close_rounded, size: 20, color: c.amberInk),
          ),
        ],
      ),
    );
  }
}

class _TodayActions extends StatelessWidget {
  const _TodayActions();

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final eyes = s.activeEyes.toList()..sort((a, b) => a.index.compareTo(b.index));
    final status = s.todayStatus;
    final worn = status == TodayStatus.worn;
    final notWorn = status == TodayStatus.notWorn;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            if (eyes.length == 2)
              for (final e in eyes) ...[
                _EyeToggle(eye: e, selected: s.selectedEyes.contains(e)),
                const SizedBox(width: 8),
              ],
            Expanded(
              child: BigButton(
                label: worn ? 'Bugün taktın' : 'Bugün taktım',
                icon: Icons.check_rounded,
                outlined: worn,
                onPressed: () => AppScope.read(context).markToday(worn: true),
              ),
            ),
          ],
        ),
        SizedBox(
          height: 48,
          width: double.infinity,
          child: TextButton(
            onPressed: () => AppScope.read(context).markToday(worn: false),
            child: Text(
              notWorn ? 'Bugün takmadın · geri al' : 'Bugün takmadım',
              style: LensType.text(size: 16, weight: FontWeight.w600, color: c.blueDeep),
            ),
          ),
        ),
      ],
    );
  }
}

class _EyeToggle extends StatelessWidget {
  const _EyeToggle({required this.eye, required this.selected});
  final Eye eye;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    final accent = eye == Eye.right ? c.blue : c.left;
    return Semantics(
      label: '${eye.label} göz',
      selected: selected,
      button: true,
      child: Material(
        color: selected ? c.tint : c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: selected ? accent : c.line, width: 2),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => AppScope.read(context).toggleEye(eye),
          child: SizedBox(
            width: 64,
            height: 64,
            child: Center(
              child: Text(eye.code,
                  style: LensType.mono(
                      size: 18, weight: FontWeight.w600, color: selected ? c.navy : c.muted)),
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyHome extends StatelessWidget {
  const _EmptyHome();

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Wordmark(size: 40),
            const Spacer(),
            Text('Lens günlerini kaçırma.',
                style: LensType.text(size: 28, weight: FontWeight.w800, color: c.ink)),
            const SizedBox(height: 12),
            Text(
              'Yeni bir lens paketi açtığında buraya ekle. Lensim kaç gündür açık olduğunu, '
              'kaç gün taktığını ve kaç gün kaldığını senin yerine sayar.',
              style: LensType.text(size: 17, color: c.muted, height: 1.45),
            ),
            const Spacer(),
            BigButton(
              label: 'İlk lens paketini ekle',
              icon: Icons.add_rounded,
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const NewPackageScreen(firstRun: true)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
