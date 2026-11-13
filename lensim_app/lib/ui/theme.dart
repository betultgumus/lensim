import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Lensim renkleri (yumuşak mavi). Açık ve koyu tema için iki takım.
@immutable
class LensColors extends ThemeExtension<LensColors> {
  final Color bg;
  final Color surface;
  final Color line;
  final Color tint;
  final Color tint2;
  final Color ink;
  final Color muted;
  final Color blue;
  final Color blueDeep;
  final Color navy;
  final Color left;
  final Color onLeft;
  final Color notWorn;
  final Color future;
  final Color amber;
  final Color amberBg;
  final Color amberLine;
  final Color amberInk;
  final Color red;
  final Color redBg;

  const LensColors({
    required this.bg,
    required this.surface,
    required this.line,
    required this.tint,
    required this.tint2,
    required this.ink,
    required this.muted,
    required this.blue,
    required this.blueDeep,
    required this.navy,
    required this.left,
    required this.onLeft,
    required this.notWorn,
    required this.future,
    required this.amber,
    required this.amberBg,
    required this.amberLine,
    required this.amberInk,
    required this.red,
    required this.redBg,
  });

  static const light = LensColors(
    bg: Color(0xFFF4F8FD),
    surface: Color(0xFFFFFFFF),
    line: Color(0xFFD5E1F0),
    tint: Color(0xFFE3ECFA),
    tint2: Color(0xFFEEF3FC),
    ink: Color(0xFF1B2B44),
    muted: Color(0xFF55657F),
    blue: Color(0xFF3E68B8),
    blueDeep: Color(0xFF2F5AA8),
    navy: Color(0xFF1F3B6E),
    left: Color(0xFF8FB0E8),
    onLeft: Color(0xFF1B2B44),
    notWorn: Color(0xFFB9CBE8),
    future: Color(0xFFEDF2FA),
    amber: Color(0xFFE8A93A),
    amberBg: Color(0xFFFFF5E2),
    amberLine: Color(0xFFF0CF94),
    amberInk: Color(0xFF5C3D00),
    red: Color(0xFFC4292F),
    redBg: Color(0xFFFCE4E4),
  );

  static const dark = LensColors(
    bg: Color(0xFF0B1426),
    surface: Color(0xFF13203A),
    line: Color(0xFF263A5E),
    tint: Color(0xFF1C2E50),
    tint2: Color(0xFF172742),
    ink: Color(0xFFE6EDF8),
    muted: Color(0xFFA2B2CD),
    blue: Color(0xFF6E97E6),
    blueDeep: Color(0xFF94B5F2),
    navy: Color(0xFFC9DAF5),
    left: Color(0xFFA9C4F0),
    onLeft: Color(0xFF0B1426),
    notWorn: Color(0xFF3A5079),
    future: Color(0xFF182844),
    amber: Color(0xFFE8A93A),
    amberBg: Color(0xFF2A2010),
    amberLine: Color(0xFF5C4618),
    amberInk: Color(0xFFF3D49A),
    red: Color(0xFFFF6B6B),
    redBg: Color(0xFF3A1518),
  );

  @override
  LensColors copyWith() => this;

  @override
  LensColors lerp(ThemeExtension<LensColors>? other, double t) {
    if (other is! LensColors) return this;
    return t < 0.5 ? this : other;
  }
}

extension LensContext on BuildContext {
  LensColors get lc => Theme.of(this).extension<LensColors>() ?? LensColors.light;
}

/// Yazı tipleri: metin Archivo, büyük rakamlar Archivo Narrow, etiketler IBM Plex Mono.
class LensType {
  LensType._();

  static TextStyle text({double size = 17, FontWeight weight = FontWeight.w400, Color? color, double? height}) =>
      GoogleFonts.getFont('Archivo', fontSize: size, fontWeight: weight, color: color, height: height);

  static TextStyle number({double size = 112, Color? color, FontWeight weight = FontWeight.w700}) =>
      GoogleFonts.getFont('Archivo Narrow',
          fontSize: size, fontWeight: weight, color: color, height: 0.9, letterSpacing: -1);

  static TextStyle mono({double size = 14, FontWeight weight = FontWeight.w500, Color? color}) =>
      GoogleFonts.getFont('IBM Plex Mono', fontSize: size, fontWeight: weight, color: color);
}

ThemeData buildTheme(Brightness b) {
  final c = b == Brightness.light ? LensColors.light : LensColors.dark;
  final base = ThemeData(
    useMaterial3: true,
    brightness: b,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF3E68B8),
      brightness: b,
      primary: c.blue,
      surface: c.surface,
    ),
  );
  final textTheme = GoogleFonts.getTextTheme('Archivo', base.textTheme).apply(
    bodyColor: c.ink,
    displayColor: c.ink,
  );
  return base.copyWith(
    scaffoldBackgroundColor: c.bg,
    textTheme: textTheme,
    extensions: [c],
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: c.ink,
      contentTextStyle: LensType.text(size: 15, color: c.bg),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: c.line)),
      enabledBorder:
          OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: c.line)),
      focusedBorder:
          OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: c.blue, width: 2)),
      labelStyle: LensType.text(size: 15, color: c.muted),
    ),
  );
}
