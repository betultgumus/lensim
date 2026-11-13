import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/models.dart';
import '../state/app_state.dart';
import 'theme.dart';
import 'widgets.dart';

/// Kutu ekleme / düzenleme: kullanım süresi, lens tipi, numara, lens sayısı, hangi göz.
class BoxFormScreen extends StatefulWidget {
  const BoxFormScreen({super.key, this.existing, this.initialEyes = 'RL'});
  final LensBox? existing;
  final String initialEyes;

  @override
  State<BoxFormScreen> createState() => _BoxFormScreenState();
}

class _BoxFormScreenState extends State<BoxFormScreen> {
  late WearPlan _plan;
  late LensKind _kind;
  late String _eyes;
  late int _count;
  final _customDays = TextEditingController();
  final _brand = TextEditingController();
  final _sph = TextEditingController();
  final _cyl = TextEditingController();
  final _axis = TextEditingController();
  final _add = TextEditingController();
  final _bc = TextEditingController();
  final _dia = TextEditingController();
  final _color = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final b = widget.existing;
    _plan = b?.plan ?? WearPlan.monthly;
    _kind = b?.kind ?? LensKind.spherical;
    _eyes = b?.eyes ?? widget.initialEyes;
    _count = b?.totalLenses ?? 6;
    _customDays.text = '${b?.durationDays ?? 30}';
    _brand.text = b?.brand ?? '';
    _sph.text = b?.sph ?? '';
    _cyl.text = b?.cyl ?? '';
    _axis.text = b?.axis ?? '';
    _add.text = b?.add ?? '';
    _bc.text = b?.bc ?? '';
    _dia.text = b?.dia ?? '';
    _color.text = b?.color ?? '';
  }

  @override
  void dispose() {
    for (final t in [_customDays, _brand, _sph, _cyl, _axis, _add, _bc, _dia, _color]) {
      t.dispose();
    }
    super.dispose();
  }

  int get _duration {
    if (_plan == WearPlan.custom) {
      final v = int.tryParse(_customDays.text) ?? 30;
      return v < 1 ? 1 : v;
    }
    return _plan.defaultDays;
  }

  Future<void> _save() async {
    final s = AppScope.read(context);
    setState(() => _saving = true);
    final box = widget.existing ??
        LensBox(
          plan: _plan,
          durationDays: _duration,
          kind: _kind,
          totalLenses: _count,
          eyes: _eyes,
          createdOn: s.today,
        );
    box
      ..plan = _plan
      ..durationDays = _duration
      ..kind = _kind
      ..totalLenses = _count
      ..eyes = _eyes
      ..brand = _brand.text.trim()
      ..sph = _sph.text.trim()
      ..cyl = _kind == LensKind.toric ? _cyl.text.trim() : ''
      ..axis = _kind == LensKind.toric ? _axis.text.trim() : ''
      ..add = _kind == LensKind.multifocal ? _add.text.trim() : ''
      ..color = _kind == LensKind.colored ? _color.text.trim() : ''
      ..bc = _bc.text.trim()
      ..dia = _dia.text.trim();
    final saved = await s.saveBox(box);
    if (!mounted) return;
    Navigator.of(context).pop(saved);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    final dailyHint = _plan == WearPlan.daily;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 24, 0),
              child: PageHeader(title: widget.existing == null ? 'Yeni kutu' : 'Kutuyu düzenle', close: true),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
                children: [
                  const SectionLabel('KULLANIM SÜRESİ'),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final p in WearPlan.values)
                        _Chip(
                          label: p.label,
                          selected: _plan == p,
                          onTap: () => setState(() {
                            _plan = p;
                            if (widget.existing == null) _count = p == WearPlan.daily ? 30 : 6;
                          }),
                        ),
                    ],
                  ),
                  if (_plan == WearPlan.custom) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: _customDays,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(labelText: 'Kaç gün kullanılıyor?'),
                    ),
                  ],
                  const SizedBox(height: 22),
                  const SectionLabel('LENS TİPİ'),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final k in LensKind.values)
                        _Chip(
                          label: k.label,
                          sub: k.hint,
                          selected: _kind == k,
                          onTap: () => setState(() => _kind = k),
                        ),
                    ],
                  ),
                  const SizedBox(height: 22),
                  const SectionLabel('NUMARA'),
                  Text('Kutunun üzerinde yazar. Bilmediğin alanı boş bırakabilirsin.',
                      style: LensType.text(size: 14, color: c.muted, height: 1.4)),
                  const SizedBox(height: 12),
                  ..._powerFields(),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: _numField(_bc, 'BC')),
                      const SizedBox(width: 10),
                      Expanded(child: _numField(_dia, 'DIA')),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _brand,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Marka (isteğe bağlı)'),
                  ),
                  const SizedBox(height: 22),
                  const SectionLabel('KUTUDA KAÇ LENS VAR?'),
                  _Stepper(
                    value: _count,
                    onChanged: (v) => setState(() => _count = v),
                    suffix: 'lens',
                  ),
                  if (dailyHint)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text('Günlük lenste her taktığın gün her göz için bir lens düşer.',
                          style: LensType.text(size: 14, color: c.muted, height: 1.4)),
                    ),
                  const SizedBox(height: 22),
                  const SectionLabel('HANGİ GÖZ İÇİN?'),
                  Segmented<String>(
                    values: const ['R', 'L', 'RL'],
                    labels: const ['Sağ', 'Sol', 'İki göz'],
                    selected: _eyes,
                    onChanged: (v) => setState(() => _eyes = v),
                  ),
                  const SizedBox(height: 8),
                  Text('İki gözün numarası aynıysa tek kutu iki göze yeter.',
                      style: LensType.text(size: 14, color: c.muted, height: 1.4)),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
              child: BigButton(label: 'Kutuyu kaydet', onPressed: _saving ? null : _save),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _powerFields() {
    switch (_kind) {
      case LensKind.spherical:
        return [_numField(_sph, 'Numara (PWR)', hint: 'örn. -2.50')];
      case LensKind.toric:
        return [
          Row(children: [
            Expanded(child: _numField(_sph, 'SPH', hint: '-1.75')),
            const SizedBox(width: 10),
            Expanded(child: _numField(_cyl, 'CYL', hint: '-0.75')),
            const SizedBox(width: 10),
            Expanded(child: _numField(_axis, 'AXIS', hint: '170', signed: false)),
          ]),
        ];
      case LensKind.multifocal:
        return [
          Row(children: [
            Expanded(child: _numField(_sph, 'SPH', hint: '-2.00')),
            const SizedBox(width: 10),
            Expanded(child: _numField(_add, 'ADD', hint: 'MED')),
          ]),
        ];
      case LensKind.colored:
        return [
          TextField(controller: _color, decoration: const InputDecoration(labelText: 'Renk')),
          const SizedBox(height: 12),
          _numField(_sph, 'Numara (varsa)', hint: '0.00'),
        ];
    }
  }

  Widget _numField(TextEditingController ctrl, String label, {String? hint, bool signed = true}) => TextField(
        controller: ctrl,
        keyboardType: TextInputType.numberWithOptions(signed: signed, decimal: true),
        style: LensType.mono(size: 16, color: context.lc.ink),
        decoration: InputDecoration(labelText: label, hintText: hint),
      );
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.selected, required this.onTap, this.sub});
  final String label;
  final String? sub;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? c.tint : c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: selected ? c.blue : c.line, width: selected ? 2 : 1),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: LensType.text(
                          size: 16, weight: selected ? FontWeight.w700 : FontWeight.w600, color: c.ink)),
                  if (sub != null) Text(sub!, style: LensType.text(size: 12, color: c.muted)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({required this.value, required this.onChanged, required this.suffix});
  final int value;
  final ValueChanged<int> onChanged;
  final String suffix;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return SoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Azalt',
            onPressed: value > 1 ? () => onChanged(value - 1) : null,
            icon: const Icon(Icons.remove_rounded),
          ),
          Expanded(
            child: Text('$value $suffix',
                textAlign: TextAlign.center,
                style: LensType.text(size: 20, weight: FontWeight.w700, color: c.ink)),
          ),
          IconButton(
            tooltip: 'Artır',
            onPressed: () => onChanged(value + 1),
            icon: const Icon(Icons.add_rounded),
          ),
        ],
      ),
    );
  }
}
