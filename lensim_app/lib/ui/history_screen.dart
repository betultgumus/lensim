import 'package:flutter/material.dart';

import '../core/day.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import 'box_form_screen.dart';
import 'eye_detail_screen.dart';
import 'lens_box_card.dart';
import 'theme.dart';
import 'widgets.dart';

/// Geçmiş: kapanmış paketler ve kutular. Ana ekranda olmayan her şey burada.
class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String _tab = 'packages';
  int? _open;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
        children: [
          Text('Geçmiş', style: LensType.text(size: 28, weight: FontWeight.w800, color: c.ink)),
          const SizedBox(height: 16),
          Segmented<String>(
            values: const ['packages', 'boxes'],
            labels: const ['Paketler', 'Kutular'],
            selected: _tab,
            height: 44,
            onChanged: (v) => setState(() => _tab = v),
          ),
          const SizedBox(height: 16),
          if (_tab == 'packages') ..._packages(context) else ..._boxes(context),
        ],
      ),
    );
  }

  List<Widget> _packages(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final list = s.closedPackages;
    if (list.isEmpty) {
      return [
        Text('Henüz kapanmış paket yok. Yeni paket açtığında eskisi buraya taşınır.',
            style: LensType.text(size: 16, color: c.muted, height: 1.45)),
      ];
    }
    return [
      for (final p in list) ...[
        _PackageRow(
          p: p,
          expanded: _open == p.id,
          onTap: () => setState(() => _open = _open == p.id ? null : p.id),
        ),
        const SizedBox(height: 10),
      ],
    ];
  }

  List<Widget> _boxes(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    return [
      if (s.boxes.isEmpty)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text('Kayıtlı kutu yok.', style: LensType.text(size: 16, color: c.muted)),
        ),
      for (final b in s.boxes) ...[
        _BoxRow(box: b),
        const SizedBox(height: 10),
      ],
      OutlinedButton.icon(
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const BoxFormScreen())),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Yeni kutu ekle'),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          foregroundColor: c.blueDeep,
          side: BorderSide(color: c.notWorn, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    ];
  }
}

class _PackageRow extends StatelessWidget {
  const _PackageRow({required this.p, required this.expanded, required this.onTap});
  final LensPackage p;
  final bool expanded;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final box = s.boxById(p.boxId);
    final st = s.statsOf(p);
    final end = p.closedOn ?? s.today;
    return Material(
      color: c.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: BorderSide(color: c.line)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  EyeBadge(p.eye),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(box?.title ?? 'Lens',
                            style: LensType.text(size: 16, weight: FontWeight.w600, color: c.ink)),
                        Text('${dottedShort(p.openedOn)} – ${dotted(end)}',
                            style: LensType.mono(size: 13, weight: FontWeight.w400, color: c.muted)),
                      ],
                    ),
                  ),
                  if (st.overdue > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: c.redBg, borderRadius: BorderRadius.circular(8)),
                      child: Text('+${st.overdue} gün',
                          style: LensType.text(size: 13, weight: FontWeight.w700, color: c.red)),
                    ),
                  const SizedBox(width: 4),
                  Icon(expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded, color: c.muted),
                ],
              ),
              if (expanded) ...[
                const SizedBox(height: 14),
                Row(
                  children: [
                    _stat(c, '${st.openDays}', 'gün açık kaldı'),
                    _stat(c, '${st.wornDays}', 'gün taktın'),
                    if (!p.isDaily) _stat(c, '${st.overdue}', 'gün aşım', color: st.overdue > 0 ? c.red : c.ink),
                  ],
                ),
                if (!p.isDaily) ...[
                  const SizedBox(height: 12),
                  CellStrip(
                    cells: cellsFor(s, p),
                    color: p.eye == Eye.right ? c.blue : c.left,
                    columns: 15,
                    cellHeight: 12,
                  ),
                ],
                const SizedBox(height: 4),
                TextButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => EyeDetailScreen(packageId: p.id!)),
                  ),
                  style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(48, 44)),
                  child: Text('Takvimi gör →',
                      style: LensType.text(size: 15, weight: FontWeight.w600, color: c.blueDeep)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _stat(LensColors c, String n, String label, {Color? color}) => Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(n, style: LensType.number(size: 36, color: color ?? c.ink)),
            Text(label, style: LensType.text(size: 13, color: c.muted)),
          ],
        ),
      );
}

class _BoxRow extends StatelessWidget {
  const _BoxRow({required this.box});
  final LensBox box;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final left = s.remainingIn(box);
    final eyes = box.eyes == 'RL' ? 'İki göz' : (box.eyes == 'R' ? 'Sağ göz' : 'Sol göz');
    return Opacity(
      opacity: box.archived ? 0.55 : 1,
      child: SoftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(box.title, style: LensType.text(size: 16, weight: FontWeight.w700, color: c.ink)),
                ),
                Text('$left / ${box.totalLenses}', style: LensType.mono(size: 14, weight: FontWeight.w600, color: c.navy)),
              ],
            ),
            const SizedBox(height: 4),
            Text([box.specLine, eyes, if (box.brand.isNotEmpty) box.brand].where((x) => x.isNotEmpty).join(' · '),
                style: LensType.mono(size: 13, weight: FontWeight.w400, color: c.muted)),
            const SizedBox(height: 8),
            Row(
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context)
                      .push(MaterialPageRoute(builder: (_) => BoxFormScreen(existing: box))),
                  child: const Text('Düzenle'),
                ),
                TextButton(
                  onPressed: () {
                    box.archived = !box.archived;
                    AppScope.read(context).saveBox(box);
                  },
                  child: Text(box.archived ? 'Arşivden çıkar' : 'Arşivle'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
