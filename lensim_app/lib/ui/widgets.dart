import 'package:flutter/material.dart';

import '../models/models.dart';
import 'theme.dart';

/// Logodaki lens: yandan görünen kontakt lens (menisküs).
class MeniscusPainter extends CustomPainter {
  MeniscusPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 120;
    final sy = size.height / 50;
    final path = Path()
      ..moveTo(6 * sx, 44 * sy)
      ..cubicTo(22 * sx, 4 * sy, 98 * sx, 4 * sy, 114 * sx, 44 * sy)
      ..cubicTo(96 * sx, 22 * sy, 24 * sx, 22 * sy, 6 * sx, 44 * sy)
      ..close();
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(MeniscusPainter old) => old.color != color;
}

/// "lensım" yazısı; "ı"nın noktası küçük bir lens.
class Wordmark extends StatelessWidget {
  const Wordmark({super.key, this.size = 28});
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    final style = LensType.text(size: size, weight: FontWeight.w800, color: c.ink, height: 1)
        .copyWith(letterSpacing: -size * 0.03);
    return Semantics(
      label: 'Lensim',
      child: ExcludeSemantics(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text('lens', style: style),
            Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.topCenter,
              children: [
                Text('ı', style: style),
                Positioned(
                  top: size * 0.04,
                  child: CustomPaint(
                    size: Size(size * 0.46, size * 0.2),
                    painter: MeniscusPainter(c.blue),
                  ),
                ),
              ],
            ),
            Text('m', style: style),
          ],
        ),
      ),
    );
  }
}

/// Göz rozeti: R koyu mavi, L açık mavi.
class EyeBadge extends StatelessWidget {
  const EyeBadge(this.eye, {super.key, this.size = 26});
  final Eye eye;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    final right = eye == Eye.right;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: right ? c.blue : c.left,
        borderRadius: BorderRadius.circular(size * 0.27),
      ),
      child: Text(
        eye.code,
        style: LensType.mono(
          size: size * 0.54,
          weight: FontWeight.w600,
          color: right ? Colors.white : c.onLeft,
        ),
      ),
    );
  }
}

/// Lens kutusunun üstündeki kapak şeridi ve yırtma çizgisi.
class BoxFlap extends StatelessWidget {
  const BoxFlap({super.key, this.color, this.dash, this.height = 14});
  final Color? color;
  final Color? dash;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return SizedBox(
      height: height,
      child: CustomPaint(
        painter: _FlapPainter(color ?? c.tint, dash ?? c.notWorn),
        child: const SizedBox.expand(),
      ),
    );
  }
}

class _FlapPainter extends CustomPainter {
  _FlapPainter(this.fill, this.dash);
  final Color fill;
  final Color dash;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = fill);
    final p = Paint()
      ..color = dash
      ..strokeWidth = 1.5;
    final y = size.height - 0.75;
    for (double x = 0; x < size.width; x += 7) {
      canvas.drawLine(Offset(x, y), Offset(x + 4, y), p);
    }
  }

  @override
  bool shouldRepaint(_FlapPainter old) => old.fill != fill || old.dash != dash;
}

/// Bölüm başlığı: "1 · HANGİ GÖZ?"
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(text, style: LensType.mono(size: 14, color: context.lc.muted)),
      );
}

/// Yumuşak zeminli seçici (Sağ / Sol / İkisi gibi).
class Segmented<T> extends StatelessWidget {
  const Segmented({
    super.key,
    required this.values,
    required this.labels,
    required this.selected,
    required this.onChanged,
    this.height = 48,
  });

  final List<T> values;
  final List<String> labels;
  final T selected;
  final ValueChanged<T> onChanged;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: c.tint, borderRadius: BorderRadius.circular(14)),
      child: Row(
        children: [
          for (var i = 0; i < values.length; i++) ...[
            if (i > 0) const SizedBox(width: 6),
            Expanded(
              child: Semantics(
                selected: values[i] == selected,
                button: true,
                child: Material(
                  color: values[i] == selected ? c.surface : Colors.transparent,
                  borderRadius: BorderRadius.circular(11),
                  elevation: values[i] == selected ? 1 : 0,
                  shadowColor: c.ink.withValues(alpha: 0.2),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(11),
                    onTap: () => onChanged(values[i]),
                    child: SizedBox(
                      height: height,
                      child: Center(
                        child: Text(
                          labels[i],
                          style: LensType.text(
                            size: 16,
                            weight: values[i] == selected ? FontWeight.w700 : FontWeight.w600,
                            color: values[i] == selected ? c.ink : c.navy,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Ana eylem düğmesi (64 yükseklik).
class BigButton extends StatelessWidget {
  const BigButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.color,
    this.foreground,
    this.outlined = false,
    this.height = 64,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Color? color;
  final Color? foreground;
  final bool outlined;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    final bg = outlined ? c.surface : (color ?? c.blue);
    final fg = foreground ?? (outlined ? c.navy : Colors.white);
    return SizedBox(
      height: height,
      child: Material(
        color: onPressed == null ? c.line : bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: outlined ? BorderSide(color: color ?? c.blue, width: 1.5) : BorderSide.none,
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onPressed,
          child: Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, color: fg, size: 22),
                  const SizedBox(width: 10),
                ],
                Flexible(
                  child: Text(
                    label,
                    overflow: TextOverflow.ellipsis,
                    style: LensType.text(size: height >= 60 ? 19 : 16, weight: FontWeight.w700, color: fg),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Lens kutusu etiketi gibi çerçeveli bilgi şeridi: [R | Aylık · Küresel | −2.50 | BC 8.6]
class LabelStrip extends StatelessWidget {
  const LabelStrip({super.key, required this.eyes, required this.parts});
  final List<Eye> eyes;
  final List<String> parts;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    final cells = <Widget>[
      for (final e in eyes)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
          color: e == Eye.right ? c.blue : c.left,
          child: Text(e.code,
              style: LensType.mono(
                  size: 14, weight: FontWeight.w600, color: e == Eye.right ? Colors.white : c.onLeft)),
        ),
      for (final p in parts.where((x) => x.isNotEmpty))
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
          decoration: BoxDecoration(border: Border(left: BorderSide(color: c.ink, width: 1.5))),
          child: Text(p, style: LensType.mono(size: 14, color: c.ink)),
        ),
    ];
    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.ink, width: 1.5),
        borderRadius: BorderRadius.circular(8),
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: IntrinsicHeight(child: Row(mainAxisSize: MainAxisSize.min, children: cells)),
      ),
    );
  }
}

/// Günlerin küçük kutucuklarla gösterildiği şerit.
enum CellState { worn, auto, notWorn, today, future, overdueWorn, overdueNot }

class CellStrip extends StatelessWidget {
  const CellStrip({
    super.key,
    required this.cells,
    required this.color,
    this.columns = 10,
    this.cellHeight = 10,
    this.labels,
  });

  final List<CellState> cells;
  final Color color;
  final int columns;
  final double cellHeight;
  final List<String>? labels;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    final rows = <Widget>[];
    for (var r = 0; r * columns < cells.length; r++) {
      final children = <Widget>[];
      for (var i = 0; i < columns; i++) {
        final idx = r * columns + i;
        if (i > 0) children.add(const SizedBox(width: 3));
        if (idx >= cells.length) {
          children.add(const Expanded(child: SizedBox()));
          continue;
        }
        children.add(Expanded(child: _cell(c, cells[idx], labels?[idx])));
      }
      if (r > 0) rows.add(const SizedBox(height: 3));
      rows.add(Row(children: children));
    }
    return Column(mainAxisSize: MainAxisSize.min, children: rows);
  }

  Widget _cell(LensColors c, CellState s, String? label) {
    Color? fill;
    Border? border;
    Color text = c.muted;
    switch (s) {
      case CellState.worn:
        fill = color;
        text = color == c.left ? c.onLeft : Colors.white;
        break;
      case CellState.auto:
        fill = c.amber;
        text = const Color(0xFF3B2600);
        break;
      case CellState.notWorn:
        border = Border.all(color: c.notWorn, width: 1.5);
        break;
      case CellState.today:
        border = Border.all(color: c.blue, width: 2);
        text = c.navy;
        break;
      case CellState.future:
        fill = c.future;
        break;
      case CellState.overdueWorn:
        fill = c.red;
        text = Colors.white;
        break;
      case CellState.overdueNot:
        border = Border.all(color: c.red, width: 1.5);
        text = c.red;
        break;
    }
    return Container(
      height: cellHeight,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: fill,
        border: border,
        borderRadius: BorderRadius.circular(cellHeight >= 24 ? 7 : 3),
      ),
      child: label == null
          ? null
          : Text(label, style: LensType.mono(size: 12, weight: FontWeight.w600, color: text)),
    );
  }
}

/// Basit bir aç/kapa düğmesi satırı.
class SwitchRow extends StatelessWidget {
  const SwitchRow({super.key, required this.label, required this.value, required this.onChanged});
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return SizedBox(
      height: 60,
      child: Row(
        children: [
          Expanded(child: Text(label, style: LensType.text(size: 16, color: c.ink))),
          Switch(
            value: value,
            onChanged: onChanged,
            activeTrackColor: c.blue,
          ),
        ],
      ),
    );
  }
}

/// Yuvarlatılmış beyaz kart.
class SoftCard extends StatelessWidget {
  const SoftCard({super.key, required this.child, this.padding = const EdgeInsets.all(16)});
  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.line),
        borderRadius: BorderRadius.circular(16),
      ),
      child: child,
    );
  }
}

/// Ekran başlığı ve geri düğmesi.
class PageHeader extends StatelessWidget {
  const PageHeader({super.key, required this.title, this.trailing, this.close = false});
  final String title;
  final Widget? trailing;
  final bool close;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return SizedBox(
      height: 56,
      child: Row(
        children: [
          IconButton(
            tooltip: close ? 'Kapat' : 'Geri',
            onPressed: () => Navigator.of(context).maybePop(),
            icon: Icon(close ? Icons.close_rounded : Icons.arrow_back_ios_new_rounded, color: c.ink),
          ),
          Expanded(
            child: Text(title,
                overflow: TextOverflow.ellipsis,
                style: LensType.text(size: 22, weight: FontWeight.w700, color: c.ink)),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

void showLensSnack(BuildContext context, String text) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));
}
