import 'package:flutter/material.dart';

import '../core/day.dart';
import '../logic/stats.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import 'eye_detail_screen.dart';
import 'new_package_screen.dart';
import 'theme.dart';
import 'widgets.dart';

/// Bir paketin gün şeridini hesaplar.
/// Süreli lens: süre boyunca her gün bir kutucuk. Günlük lens: bu ayın günleri.
List<CellState> cellsFor(AppState s, LensPackage p, {int cap = 90}) {
  final marks = s.marksOf(p);
  final today = s.today;
  final out = <CellState>[];
  if (p.isDaily) {
    final first = today.firstOfMonth;
    for (var i = 0; i < today.daysInMonth; i++) {
      final d = first.addDays(i);
      out.add(_stateOf(d, marks, today, p.openedOn, null));
    }
    return out;
  }
  final n = p.durationDays.clamp(1, cap).toInt();
  for (var i = 0; i < n; i++) {
    out.add(_stateOf(p.openedOn.addDays(i), marks, today, p.openedOn, p.closedOn));
  }
  return out;
}

CellState _stateOf(Day d, Map<String, DayMark> marks, Day today, Day opened, Day? closed) {
  if (d.isAfter(today) || d.isBefore(opened) || (closed != null && d.isAfter(closed))) {
    return CellState.future;
  }
  final m = marks[d.key];
  if (m == null) return CellState.today;
  if (m.auto && m.worn) return CellState.auto;
  return m.worn ? CellState.worn : CellState.notWorn;
}

/// Ana ekrandaki lens kutusu. Süresi dolmuşsa etrafı kırmızı ışık saçar.
class LensBoxCard extends StatelessWidget {
  const LensBoxCard({super.key, required this.card, this.compact = false});
  final HomeCard card;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final p = card.first;
    final box = s.boxById(p.boxId);
    final st = s.statsOf(p);
    final st2 = card.combined ? s.statsOf(card.packages[1]) : null;
    final expired = st.expired || (st2?.expired ?? false);
    final color = (card.combined || p.eye == Eye.right) ? c.blue : c.left;

    final eyesLabel = card.combined ? 'İki göz' : p.eye.label;
    final spec = box == null
        ? ''
        : [box.plan.label, if (box.shortSpec.isNotEmpty) box.shortSpec].join(' · ');

    final content = Padding(
      padding: EdgeInsets.fromLTRB(compact ? 14 : 18, 12, compact ? 14 : 18, compact ? 14 : 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (card.combined) ...[
                const EyeBadge(Eye.right),
                const SizedBox(width: 6),
                const EyeBadge(Eye.left),
              ] else
                EyeBadge(p.eye),
              const SizedBox(width: 8),
              Flexible(
                child: Text(eyesLabel,
                    overflow: TextOverflow.ellipsis,
                    style: LensType.text(size: 16, weight: FontWeight.w700, color: c.ink)),
              ),
              if (!compact && spec.isNotEmpty) ...[
                const Spacer(),
                Text(spec, style: LensType.mono(size: 13, weight: FontWeight.w400, color: c.muted)),
              ],
            ],
          ),
          if (compact && spec.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(spec,
                overflow: TextOverflow.ellipsis,
                style: LensType.mono(size: 13, weight: FontWeight.w400, color: c.muted)),
          ],
          const SizedBox(height: 10),
          _BigNumber(p: p, st: st, compact: compact),
          const SizedBox(height: 12),
          CellStrip(
            cells: cellsFor(s, p),
            color: color,
            columns: p.isDaily ? 10 : (compact ? 10 : 15),
            cellHeight: p.isDaily && !compact ? 28 : (compact ? 10 : 12),
            labels: p.isDaily && !compact
                ? [for (var i = 1; i <= s.today.daysInMonth; i++) '$i']
                : null,
          ),
          if (!p.isDaily && p.durationDays > 90)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('ilk 90 gün', style: LensType.mono(size: 12, color: c.muted)),
            ),
          const SizedBox(height: 12),
          ..._statLines(context, s, c, card, st, st2, box),
        ],
      ),
    );

    final card0 = Material(
      color: c.surface,
      borderRadius: BorderRadius.circular(18),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => EyeDetailScreen(packageId: p.id!)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            BoxFlap(
              color: expired ? c.redBg : c.tint,
              dash: expired ? c.red.withValues(alpha: 0.45) : c.notWorn,
            ),
            content,
          ],
        ),
      ),
    );

    return Semantics(
      button: true,
      label: '$eyesLabel lens kutusu. Ayrıntı için dokun.',
      child: expired
          ? _RedGlow(child: card0)
          : DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: c.line),
              ),
              position: DecorationPosition.foreground,
              child: card0,
            ),
    );
  }

  List<Widget> _statLines(BuildContext context, AppState s, LensColors c, HomeCard card,
      PackageStats st, PackageStats? st2, LensBox? box) {
    final p = card.first;
    final line = LensType.text(size: 15, color: c.ink, height: 1.35);
    final wornText = (st2 != null && st2.wornDays != st.wornDays)
        ? 'R ${st.wornDays} · L ${st2.wornDays} gün taktın'
        : '${st.wornDays} gün taktın';

    if (p.isDaily) {
      final left = box == null ? 0 : s.remainingIn(box);
      final lasts = box == null ? null : s.boxLastsLabel(box);
      return [
        Container(height: 1, color: c.tint),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(child: Text('Kutuda $left lens', style: line.copyWith(fontWeight: FontWeight.w600))),
            if (lasts != null) Text('≈ $lasts yeter', style: LensType.mono(size: 13, color: c.muted)),
          ],
        ),
      ];
    }

    if (st.expired || (st2?.expired ?? false)) {
      final over = st.overdue > (st2?.overdue ?? 0) ? st.overdue : (st2?.overdue ?? 0);
      return [
        Text('Süresi $over gün önce doldu',
            style: line.copyWith(fontWeight: FontWeight.w700, color: c.red)),
        Text(wornText, style: line),
        const SizedBox(height: 10),
        BigButton(
          label: 'Yeni paket aç',
          height: 44,
          color: c.red,
          onPressed: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => NewPackageScreen(preselect: card.packages.map((x) => x.eye).toSet()),
          )),
        ),
      ];
    }

    return [
      Text('${st.openDays} gündür açık', style: line),
      Text(wornText, style: line),
      Text(
        st.isLastDay ? 'Bugün son gün' : '${st.remaining} gün kaldı',
        style: line.copyWith(fontWeight: FontWeight.w700, color: st.isLastDay ? c.amberInk : c.blueDeep),
      ),
    ];
  }
}

class _BigNumber extends StatelessWidget {
  const _BigNumber({required this.p, required this.st, required this.compact});
  final LensPackage p;
  final PackageStats st;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    final s = AppScope.of(context);
    final size = compact ? 104.0 : 124.0;
    if (p.isDaily) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text('${st.wornThisMonth}', style: LensType.number(size: size, color: c.ink)),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('gün taktın', style: LensType.text(size: 18, weight: FontWeight.w700, color: c.ink)),
                  Text(trUpper(monthYear(s.today)), style: LensType.mono(size: 13, color: c.muted)),
                ],
              ),
            ),
          ),
        ],
      );
    }
    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: Alignment.centerLeft,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text('${st.openDays}',
              style: LensType.number(size: size, color: st.expired ? c.red : c.ink)),
          const SizedBox(width: 4),
          Text('/${p.durationDays}', style: LensType.mono(size: 16, weight: FontWeight.w400, color: c.muted)),
        ],
      ),
    );
  }
}

/// Süresi dolmuş kutunun etrafındaki yavaşça nefes alan kırmızı ışık.
class _RedGlow extends StatefulWidget {
  const _RedGlow({required this.child});
  final Widget child;

  @override
  State<_RedGlow> createState() => _RedGlowState();
}

class _RedGlowState extends State<_RedGlow> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))..repeat(reverse: true);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    final reduce = MediaQuery.of(context).disableAnimations;
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        final t = reduce ? 0.6 : Curves.easeInOut.transform(_ctrl.value);
        return DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(color: c.red.withValues(alpha: 0.16), spreadRadius: 4),
              BoxShadow(
                color: c.red.withValues(alpha: 0.30 + 0.20 * t),
                blurRadius: 20 + 16 * t,
                spreadRadius: 3 + 4 * t,
              ),
            ],
          ),
          position: DecorationPosition.background,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: c.red, width: 2),
            ),
            position: DecorationPosition.foreground,
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}
