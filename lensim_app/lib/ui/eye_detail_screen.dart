import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/day.dart';
import '../logic/stats.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import 'new_package_screen.dart';
import 'theme.dart';
import 'widgets.dart';

/// Bir gözün paket ayrıntısı: üç sayı, takvim ve gün düzeltme.
class EyeDetailScreen extends StatefulWidget {
  const EyeDetailScreen({super.key, required this.packageId});
  final int packageId;

  @override
  State<EyeDetailScreen> createState() => _EyeDetailScreenState();
}

class _EyeDetailScreenState extends State<EyeDetailScreen> {
  late int _packageId = widget.packageId;
  Day? _month;
  Day? _selected;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final p = s.packageById(_packageId);
    if (p == null) {
      return Scaffold(body: SafeArea(child: PageHeader(title: 'Paket bulunamadı')));
    }
    final box = s.boxById(p.boxId);
    final st = s.statsOf(p);
    final partner = s.partnerOf(p);
    final end = p.closedOn ?? s.today;
    final month = _month ?? end.firstOfMonth;
    final selected = _selected ?? end;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(12, 8, 24, 24),
          children: [
            PageHeader(
              title: '${p.eye.label} göz${p.isActive ? '' : ' · geçmiş'}',
              trailing: TextButton(
                onPressed: () => _edit(context, s, p),
                child: Text('Düzenle', style: LensType.text(size: 16, weight: FontWeight.w600, color: c.blueDeep)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(left: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (partner != null) ...[
                    Segmented<int>(
                      values: [p.eye == Eye.right ? p.id! : partner.id!, p.eye == Eye.right ? partner.id! : p.id!],
                      labels: const ['Sağ göz', 'Sol göz'],
                      selected: p.id!,
                      height: 44,
                      onChanged: (id) => setState(() => _packageId = id),
                    ),
                    const SizedBox(height: 14),
                  ],
                  Align(
                    alignment: Alignment.centerLeft,
                    child: LabelStrip(
                      eyes: [p.eye],
                      parts: [if (box != null) box.title, if (box != null) ...box.specLine.split(' · ')],
                    ),
                  ),
                  if (box != null && box.brand.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(box.brand, style: LensType.mono(size: 13, color: c.muted)),
                  ],
                  const SizedBox(height: 14),
                  _Numbers(p: p, st: st, box: box),
                  const SizedBox(height: 14),
                  _Calendar(
                    p: p,
                    month: month,
                    selected: selected,
                    onMonth: (m) => setState(() => _month = m),
                    onSelect: (d) => setState(() => _selected = d),
                  ),
                  const SizedBox(height: 14),
                  _DayPanel(p: p, day: selected),
                  const SizedBox(height: 18),
                  if (box != null) _BoxInfo(p: p, box: box),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _edit(BuildContext context, AppState s, LensPackage p) async {
    final c = context.lc;
    var opened = p.openedOn;
    final durationCtrl = TextEditingController(text: '${p.durationDays}');
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Paketi düzenle'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Açılış tarihi', style: LensType.mono(size: 13, color: c.muted)),
              const SizedBox(height: 6),
              OutlinedButton(
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                onPressed: () async {
                  final picked = await showDatePicker(
                    context: ctx,
                    initialDate: opened.at(12, 0),
                    firstDate: DateTime(2020),
                    lastDate: s.today.at(12, 0),
                  );
                  if (picked != null) setD(() => opened = Day.fromDate(picked));
                },
                child: Text('${dayMonth(opened)} ${opened.year}'),
              ),
              if (!p.isDaily) ...[
                const SizedBox(height: 14),
                TextField(
                  controller: durationCtrl,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(labelText: 'Kullanım süresi (gün)'),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, 'delete'),
              child: Text('Paketi sil', style: TextStyle(color: c.red)),
            ),
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Vazgeç')),
            FilledButton(onPressed: () => Navigator.pop(ctx, 'save'), child: const Text('Kaydet')),
          ],
        ),
      ),
    );
    if (!context.mounted) return;
    if (result == 'save') {
      final days = int.tryParse(durationCtrl.text) ?? p.durationDays;
      await s.editPackage(p, openedOn: opened, durationDays: days < 1 ? 1 : days);
    } else if (result == 'delete') {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Paket silinsin mi?'),
          content: const Text('Bu paketin tüm gün kayıtları da silinir. Bu işlem geri alınamaz.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Vazgeç')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sil')),
          ],
        ),
      );
      if (ok == true) {
        await s.deletePackage(p);
        if (context.mounted) Navigator.of(context).pop();
      }
    }
  }
}

class _Numbers extends StatelessWidget {
  const _Numbers({required this.p, required this.st, required this.box});
  final LensPackage p;
  final PackageStats st;
  final LensBox? box;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final tiles = <(String, String, bool)>[];
    if (p.isDaily) {
      tiles.add(('${st.wornThisMonth}', 'gün bu ay', false));
      tiles.add(('${st.wornDays}', 'gün toplam', false));
      tiles.add(('${box == null ? 0 : s.remainingIn(box!)}', 'lens kaldı', true));
    } else {
      tiles.add(('${st.openDays}', 'gündür açık', false));
      tiles.add(('${st.wornDays}', 'gün taktın', false));
      if (st.expired) {
        tiles.add(('${st.overdue}', 'gün geçti', true));
      } else {
        tiles.add(('${st.remaining}', 'gün kaldı', true));
      }
    }
    return Row(
      children: [
        for (var i = 0; i < tiles.length; i++) ...[
          if (i > 0) const SizedBox(width: 10),
          Expanded(
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              decoration: BoxDecoration(
                color: tiles[i].$3 ? (st.expired ? c.redBg : c.tint) : c.surface,
                border: Border.all(color: tiles[i].$3 ? (st.expired ? c.red : c.notWorn) : c.line),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(tiles[i].$1,
                      style: LensType.number(
                          size: 44, color: tiles[i].$3 ? (st.expired ? c.red : c.blueDeep) : c.ink)),
                  const SizedBox(height: 2),
                  Text(tiles[i].$2,
                      style: LensType.text(size: 14, color: tiles[i].$3 ? c.navy : c.muted)),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

enum _Cal { outside, future, lastDayFuture, todayEmpty, worn, notWorn, autoWorn, autoNot, overdueWorn, overdueNot }

class _Calendar extends StatelessWidget {
  const _Calendar({
    required this.p,
    required this.month,
    required this.selected,
    required this.onMonth,
    required this.onSelect,
  });

  final LensPackage p;
  final Day month;
  final Day selected;
  final ValueChanged<Day> onMonth;
  final ValueChanged<Day> onSelect;

  _Cal _state(AppState s, Day d) {
    final end = p.closedOn ?? s.today;
    final last = p.isDaily ? null : p.lastDay;
    if (d.isBefore(p.openedOn)) return _Cal.outside;
    if (d.isAfter(end)) {
      if (p.closedOn == null && last != null && !d.isAfter(last)) {
        return d == last ? _Cal.lastDayFuture : _Cal.future;
      }
      return _Cal.outside;
    }
    final m = s.marksOf(p)[d.key];
    if (m == null) return d == s.today ? _Cal.todayEmpty : _Cal.outside;
    final over = last != null && d.isAfter(last);
    if (m.auto) return m.worn ? _Cal.autoWorn : _Cal.autoNot;
    if (m.worn) return over ? _Cal.overdueWorn : _Cal.worn;
    return over ? _Cal.overdueNot : _Cal.notWorn;
  }

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final first = month.firstOfMonth;
    final offset = first.weekday - 1;
    final total = offset + first.daysInMonth;
    final rows = (total / 7).ceil();
    final color = p.eye == Eye.right ? c.blue : c.left;
    final onColor = p.eye == Eye.right ? Colors.white : c.onLeft;

    Widget cell(int index) {
      final dayNum = index - offset + 1;
      if (dayNum < 1 || dayNum > first.daysInMonth) return const SizedBox(height: 42);
      final d = Day(first.year, first.month, dayNum);
      final st = _state(s, d);
      Color? fill;
      Border? border;
      var text = c.ink;
      var weight = FontWeight.w600;
      switch (st) {
        case _Cal.outside:
          text = c.muted.withValues(alpha: 0.6);
          weight = FontWeight.w400;
          break;
        case _Cal.future:
          fill = c.future;
          text = c.muted;
          weight = FontWeight.w400;
          break;
        case _Cal.lastDayFuture:
          fill = c.future;
          border = Border.all(color: c.blue, width: 1.5);
          text = c.navy;
          break;
        case _Cal.todayEmpty:
          border = Border.all(color: c.blue, width: 2);
          text = c.navy;
          break;
        case _Cal.worn:
          fill = color;
          text = onColor;
          break;
        case _Cal.notWorn:
          border = Border.all(color: c.notWorn, width: 1.5);
          text = c.muted;
          weight = FontWeight.w500;
          break;
        case _Cal.autoWorn:
          fill = c.amber;
          text = const Color(0xFF3B2600);
          break;
        case _Cal.autoNot:
          border = Border.all(color: c.amber, width: 2);
          text = c.amberInk;
          break;
        case _Cal.overdueWorn:
          fill = c.red;
          text = Colors.white;
          break;
        case _Cal.overdueNot:
          border = Border.all(color: c.red, width: 1.5);
          text = c.red;
          break;
      }
      final isSel = d == selected;
      return Semantics(
        button: true,
        selected: isSel,
        label: dayMonthWeekday(d),
        child: GestureDetector(
          onTap: () => onSelect(d),
          child: Container(
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: fill,
              border: border,
              borderRadius: BorderRadius.circular(9),
              boxShadow: isSel
                  ? [
                      BoxShadow(color: c.surface, spreadRadius: 2),
                      BoxShadow(color: c.ink, spreadRadius: 4),
                    ]
                  : null,
            ),
            child: Text('$dayNum', style: LensType.mono(size: 15, weight: weight, color: text)),
          ),
        ),
      );
    }

    final prevMonth = Day(first.month == 1 ? first.year - 1 : first.year, first.month == 1 ? 12 : first.month - 1, 1);
    final nextMonth = Day(first.month == 12 ? first.year + 1 : first.year, first.month == 12 ? 1 : first.month + 1, 1);

    return SoftCard(
      padding: const EdgeInsets.fromLTRB(10, 6, 10, 12),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Önceki ay',
                onPressed: () => onMonth(prevMonth),
                icon: Icon(Icons.chevron_left_rounded, color: c.ink),
              ),
              Expanded(
                child: Text(monthYear(first),
                    textAlign: TextAlign.center,
                    style: LensType.text(size: 18, weight: FontWeight.w700, color: c.ink)),
              ),
              IconButton(
                tooltip: 'Sonraki ay',
                onPressed: () => onMonth(nextMonth),
                icon: Icon(Icons.chevron_right_rounded, color: c.ink),
              ),
            ],
          ),
          Row(
            children: [
              for (final w in trWeekdaysShort)
                Expanded(
                  child: Center(child: Text(w, style: LensType.mono(size: 12, color: c.muted))),
                ),
            ],
          ),
          const SizedBox(height: 6),
          for (var r = 0; r < rows; r++) ...[
            if (r > 0) const SizedBox(height: 6),
            Row(
              children: [
                for (var i = 0; i < 7; i++) ...[
                  if (i > 0) const SizedBox(width: 6),
                  Expanded(child: cell(r * 7 + i)),
                ],
              ],
            ),
          ],
          const SizedBox(height: 10),
          Wrap(
            spacing: 12,
            runSpacing: 6,
            children: [
              _legend(c, 'Taktım', fill: color),
              _legend(c, 'Takmadım', border: c.notWorn),
              _legend(c, 'Otomatik', fill: c.amber),
              if (!p.isDaily) _legend(c, 'Son gün', border: c.blue),
            ],
          ),
        ],
      ),
    );
  }

  Widget _legend(LensColors c, String label, {Color? fill, Color? border}) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: fill,
              border: border == null ? null : Border.all(color: border, width: 1.5),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: 6),
          Text(label, style: LensType.text(size: 13, color: c.muted)),
        ],
      );
}

/// Seçilen günün durumu ve değiştirme düğmeleri.
class _DayPanel extends StatelessWidget {
  const _DayPanel({required this.p, required this.day});
  final LensPackage p;
  final Day day;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final end = p.closedOn ?? s.today;
    final title = trUpper(dayMonthWeekday(day));

    if (day.isAfter(s.today)) {
      return _note(c, title, 'Gelecek günler işaretlenemez.');
    }
    if (day.isBefore(p.openedOn) || day.isAfter(end)) {
      return _note(c, title, 'Bu gün bu paketin dışında.');
    }
    final m = s.marksOf(p)[day.key];
    final auto = m?.auto ?? false;
    final defaultLabel = s.settings.defaultWorn ? 'taktım' : 'takmadım';
    final String body;
    if (m == null) {
      body = 'Bu gün henüz işaretlenmedi.';
    } else if (auto) {
      body = 'Bu gün cevap vermediğin için varsayılan seçimin olan “$defaultLabel” ile dolduruldu. '
          'Gerçekten taktın mı?';
    } else {
      body = m.worn ? 'Bu gün lensi taktın.' : 'Bu gün lensi takmadın.';
    }

    final bg = auto ? c.amberBg : c.surface;
    final line = auto ? c.amberLine : c.line;
    final ink = auto ? c.amberInk : c.ink;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: bg, border: Border.all(color: line), borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(auto ? '$title · OTOMATİK' : title,
              style: LensType.mono(size: 13, weight: FontWeight.w600, color: ink)),
          const SizedBox(height: 8),
          Text(body, style: LensType.text(size: 15, color: ink, height: 1.4)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: BigButton(
                  label: 'Taktım',
                  height: 48,
                  outlined: !(m != null && !auto && m.worn),
                  onPressed: () => s.setDay(p, day, worn: true),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: BigButton(
                  label: 'Takmadım',
                  height: 48,
                  outlined: !(m != null && !auto && !m.worn),
                  onPressed: () => s.setDay(p, day, worn: false),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _note(LensColors c, String title, String text) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.surface,
          border: Border.all(color: c.line),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: LensType.mono(size: 13, weight: FontWeight.w600, color: c.muted)),
            const SizedBox(height: 6),
            Text(text, style: LensType.text(size: 15, color: c.ink)),
          ],
        ),
      );
}

class _BoxInfo extends StatelessWidget {
  const _BoxInfo({required this.p, required this.box});
  final LensPackage p;
  final LensBox box;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final left = s.remainingIn(box);
    final lasts = s.boxLastsLabel(box);
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(children: [
                  const TextSpan(text: 'Yedek: '),
                  TextSpan(text: '$left lens', style: const TextStyle(fontWeight: FontWeight.w700)),
                ]),
                style: LensType.text(size: 15, color: c.ink),
              ),
              if (lasts != null) Text('≈ $lasts yeter', style: LensType.mono(size: 13, color: c.muted)),
            ],
          ),
        ),
        if (p.isActive)
          OutlinedButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => NewPackageScreen(preselect: {p.eye})),
            ),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(48, 48),
              foregroundColor: c.navy,
              side: BorderSide(color: c.blue, width: 1.5),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text('Bitir, yenisini aç', style: LensType.text(size: 15, weight: FontWeight.w700, color: c.navy)),
          ),
      ],
    );
  }
}
