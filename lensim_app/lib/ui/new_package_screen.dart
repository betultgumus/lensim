import 'package:flutter/material.dart';

import '../core/day.dart';
import '../models/models.dart';
import '../services/notifications.dart';
import '../state/app_state.dart';
import 'box_form_screen.dart';
import 'theme.dart';
import 'widgets.dart';

/// "Yeni paket açtım": göz, kutu ve açılış tarihi. İlk kurulumda varsayılan cevap ve saat de sorulur.
class NewPackageScreen extends StatefulWidget {
  const NewPackageScreen({super.key, this.preselect, this.firstRun = false});
  final Set<Eye>? preselect;
  final bool firstRun;

  @override
  State<NewPackageScreen> createState() => _NewPackageScreenState();
}

class _NewPackageScreenState extends State<NewPackageScreen> {
  late String _mode;
  LensBox? _boxR;
  LensBox? _boxL;
  late Day _opened;
  bool _defaultWorn = true;
  TimeOfDay _reminder = const TimeOfDay(hour: 21, minute: 0);
  bool _saving = false;
  bool _init = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_init) return;
    _init = true;
    final s = AppScope.read(context);
    final pre = widget.preselect;
    if (pre != null && pre.length == 1) {
      _mode = pre.first.code;
    } else {
      _mode = 'RL';
    }
    _opened = s.today;
    _defaultWorn = s.settings.defaultWorn;
    _reminder = TimeOfDay(hour: s.settings.reminderHour, minute: s.settings.reminderMinute);
    _boxR = _suggest(s, Eye.right);
    _boxL = _suggest(s, Eye.left);
  }

  /// Önce o gözün şu an kullandığı kutu, yoksa o göze uyan en yeni kutu.
  LensBox? _suggest(AppState s, Eye e) {
    final current = s.activeFor(e);
    if (current != null) {
      final b = s.boxById(current.boxId);
      if (b != null && !b.archived && (b.isDaily || s.remainingIn(b) > 0)) return b;
    }
    for (final b in s.boxes) {
      if (b.archived || !b.serves(e)) continue;
      if (b.isDaily || s.remainingIn(b) > 0) return b;
    }
    return null;
  }

  List<Eye> get _eyes => _mode == 'RL' ? [Eye.right, Eye.left] : [_mode == 'L' ? Eye.left : Eye.right];

  LensBox? _boxFor(Eye e) => e == Eye.right ? _boxR : _boxL;

  void _setBox(Eye e, LensBox b) => setState(() {
        if (e == Eye.right) {
          _boxR = b;
        } else {
          _boxL = b;
        }
      });

  bool get _ready => _eyes.every((e) => _boxFor(e) != null) && !_saving;

  Future<void> _addBox() async {
    final created = await Navigator.of(context).push<LensBox>(
      MaterialPageRoute(builder: (_) => BoxFormScreen(initialEyes: _mode)),
    );
    if (created == null || !mounted) return;
    setState(() {
      if (created.serves(Eye.right)) _boxR = created;
      if (created.serves(Eye.left)) _boxL = created;
    });
  }

  Future<void> _pickDate() async {
    final s = AppScope.read(context);
    final picked = await showDatePicker(
      context: context,
      initialDate: _opened.at(12, 0),
      firstDate: s.today.addDays(-180).at(12, 0),
      lastDate: s.today.at(12, 0),
      helpText: 'Paketi ne zaman açtın?',
    );
    if (picked != null) setState(() => _opened = Day.fromDate(picked));
  }

  Future<void> _pickTime() async {
    final t = await showTimePicker(context: context, initialTime: _reminder, helpText: 'Günlük soru saati');
    if (t != null) setState(() => _reminder = t);
  }

  Future<void> _save() async {
    final s = AppScope.read(context);
    setState(() => _saving = true);
    final choice = <Eye, LensBox>{for (final e in _eyes) e: _boxFor(e)!};
    final emptied = await s.openPackages(choice, _opened);
    if (widget.firstRun) {
      final st = s.settings
        ..defaultWorn = _defaultWorn
        ..reminderHour = _reminder.hour
        ..reminderMinute = _reminder.minute;
      await s.saveSettings(st);
      await Notifier.requestPermission();
      await s.refresh();
    }
    if (!mounted) return;
    final nav = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    nav.pop();
    if (emptied.isNotEmpty) {
      messenger.showSnackBar(const SnackBar(content: Text('Kutuda yedek lens kalmadı. Yenisini alma zamanı.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final today = s.today;

    final summaryBox = _boxFor(_eyes.first);
    String summary;
    if (summaryBox == null) {
      summary = 'Devam etmek için bir kutu seç ya da yeni kutu ekle.';
    } else if (summaryBox.isDaily) {
      summary = 'Günlük lens: her taktığın gün kutudan lens düşer.';
    } else {
      final last = _opened.addDays(summaryBox.durationDays - 1);
      final from = _opened == today ? 'bugünden' : '${dayMonth(_opened)} gününden';
      summary = 'Süre $from başlar · son gün ${dayMonth(last)}';
    }

    var step = 0;
    String label(String t) {
      step++;
      return '$step · $t';
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 24, 0),
              child: PageHeader(
                title: widget.firstRun ? 'İlk lens paketin' : 'Yeni paket açtım',
                close: true,
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
                children: [
                  SectionLabel(label('HANGİ GÖZ?')),
                  Segmented<String>(
                    values: const ['R', 'L', 'RL'],
                    labels: const ['Sağ', 'Sol', 'İkisi'],
                    selected: _mode,
                    onChanged: (v) => setState(() => _mode = v),
                  ),
                  const SizedBox(height: 22),
                  SectionLabel(label('HANGİ KUTUDAN?')),
                  for (final e in _eyes) ...[
                    if (_eyes.length == 2)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8, top: 2),
                        child: Row(
                          children: [
                            EyeBadge(e, size: 22),
                            const SizedBox(width: 8),
                            Text('${e.label} göz', style: LensType.text(size: 15, weight: FontWeight.w700, color: c.ink)),
                          ],
                        ),
                      ),
                    ..._boxOptions(s, c, e),
                    const SizedBox(height: 10),
                  ],
                  _AddBoxButton(onTap: _addBox),
                  const SizedBox(height: 22),
                  SectionLabel(label('NE ZAMAN AÇTIN?')),
                  _FieldButton(
                    text: _opened == today ? 'Bugün · ${dayMonth(_opened)}' : '${dayMonthWeekday(_opened)} ${_opened.year}',
                    icon: Icons.calendar_today_rounded,
                    onTap: _pickDate,
                  ),
                  if (widget.firstRun) ...[
                    const SizedBox(height: 22),
                    SectionLabel(label('CEVAP VERMEDİĞİM GÜNÜ')),
                    Segmented<bool>(
                      values: const [true, false],
                      labels: const ['Taktım say', 'Takmadım say'],
                      selected: _defaultWorn,
                      onChanged: (v) => setState(() => _defaultWorn = v),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Bir gün cevap vermezsen gece 02:00\'de bu seçimle dolar. Takvimden her zaman düzeltebilirsin.',
                      style: LensType.text(size: 14, color: c.muted, height: 1.4),
                    ),
                    const SizedBox(height: 22),
                    SectionLabel(label('GÜNLÜK SORU SAATİ')),
                    _FieldButton(
                      text: '${_reminder.hour.toString().padLeft(2, '0')}:${_reminder.minute.toString().padLeft(2, '0')}',
                      icon: Icons.notifications_none_rounded,
                      onTap: _pickTime,
                    ),
                    const SizedBox(height: 8),
                    Text('Her gün bu saatte “Bugün lens taktın mı?” diye sorarız.',
                        style: LensType.text(size: 14, color: c.muted, height: 1.4)),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
              child: Column(
                children: [
                  Text(summary,
                      textAlign: TextAlign.center,
                      style: LensType.text(size: 15, color: c.muted, height: 1.4)),
                  const SizedBox(height: 10),
                  BigButton(label: 'Paketi aç', onPressed: _ready ? _save : null),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _boxOptions(AppState s, LensColors c, Eye e) {
    final list = s.boxes.where((b) => !b.archived && b.serves(e)).toList();
    if (list.isEmpty) {
      return [
        Text('${e.label} göze uygun kayıtlı kutu yok.', style: LensType.text(size: 15, color: c.muted)),
      ];
    }
    return [
      for (final b in list)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: _BoxOption(
            box: b,
            selected: _boxFor(e)?.id == b.id,
            remaining: s.remainingIn(b),
            usesAfter: _usesFrom(b),
            onTap: () => _setBox(e, b),
          ),
        ),
    ];
  }

  /// Bu açılışta seçilen kutudan kaç lens çıkacak.
  int _usesFrom(LensBox b) {
    if (b.isDaily) return 0;
    return _eyes.where((e) => _boxFor(e)?.id == b.id).length;
  }
}

class _BoxOption extends StatelessWidget {
  const _BoxOption({
    required this.box,
    required this.selected,
    required this.remaining,
    required this.usesAfter,
    required this.onTap,
  });

  final LensBox box;
  final bool selected;
  final int remaining;
  final int usesAfter;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    final eyesText = box.eyes == 'RL' ? 'R+L' : box.eyes;
    final spec = [box.specLine, eyesText].where((x) => x.isNotEmpty).join(' · ');
    String stock;
    if (box.isDaily) {
      stock = '$remaining lens var';
    } else if (selected && usesAfter > 0) {
      final after = remaining - usesAfter;
      stock = '$remaining lens var · açınca ${after < 0 ? 0 : after} kalacak';
    } else {
      stock = '$remaining lens var';
    }
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: selected ? c.blue : c.line, width: selected ? 2 : 1),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              BoxFlap(height: 10, color: selected ? c.tint : c.tint2, dash: selected ? c.notWorn : c.line),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                child: Row(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: selected ? c.blue : c.notWorn, width: selected ? 7 : 2),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(box.title, style: LensType.text(size: 17, weight: FontWeight.w700, color: c.ink)),
                          if (spec.isNotEmpty) ...[
                            const SizedBox(height: 3),
                            Text(spec, style: LensType.mono(size: 13, weight: FontWeight.w400, color: c.muted)),
                          ],
                          const SizedBox(height: 3),
                          Text(stock,
                              style: LensType.text(
                                  size: 14,
                                  color: remaining == 0 ? c.red : (selected ? c.navy : c.muted))),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddBoxButton extends StatelessWidget {
  const _AddBoxButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: const Icon(Icons.add_rounded),
      label: Text('Yeni kutu ekle', style: LensType.text(size: 16, weight: FontWeight.w600, color: c.blueDeep)),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(56),
        foregroundColor: c.blueDeep,
        side: BorderSide(color: c.notWorn, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}

class _FieldButton extends StatelessWidget {
  const _FieldButton({required this.text, required this.icon, required this.onTap});
  final String text;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return Material(
      color: c.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: c.line)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: SizedBox(
          height: 56,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(child: Text(text, style: LensType.text(size: 17, weight: FontWeight.w600, color: c.ink))),
                Icon(icon, color: c.muted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
