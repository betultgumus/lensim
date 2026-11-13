import '../core/day.dart';

enum Eye { right, left }

extension EyeX on Eye {
  String get code => this == Eye.right ? 'R' : 'L';
  String get label => this == Eye.right ? 'Sağ' : 'Sol';
  String get genitive => this == Eye.right ? 'Sağ' : 'Sol';
}

Eye eyeFromCode(String s) => s == 'L' ? Eye.left : Eye.right;

/// Lensin kullanım süresi türü.
enum WearPlan {
  daily(1, 'Günlük'),
  biweekly(14, '2 haftalık'),
  fifteen(15, '15 günlük'),
  monthly(30, 'Aylık'),
  quarterly(90, '3 aylık'),
  custom(30, 'Özel');

  const WearPlan(this.defaultDays, this.label);
  final int defaultDays;
  final String label;
}

WearPlan wearPlanFromName(String s) =>
    WearPlan.values.firstWhere((e) => e.name == s, orElse: () => WearPlan.monthly);

/// Lens tipi: hangi numara alanlarının girileceğini belirler.
enum LensKind {
  spherical('Küresel', 'Miyop / hipermetrop'),
  toric('Torik', 'Astigmat'),
  multifocal('Multifokal', 'Yakın + uzak'),
  colored('Renkli', 'Kozmetik');

  const LensKind(this.label, this.hint);
  final String label;
  final String hint;
}

LensKind lensKindFromName(String s) =>
    LensKind.values.firstWhere((e) => e.name == s, orElse: () => LensKind.spherical);

/// Satın alınan, içinde yedek lensler duran kutu.
class LensBox {
  int? id;
  WearPlan plan;
  int durationDays;
  LensKind kind;
  String brand;
  String sph;
  String cyl;
  String axis;
  String add;
  String bc;
  String dia;
  String color;
  int totalLenses;

  /// 'R', 'L' ya da 'RL' (iki gözün numarası aynıysa).
  String eyes;
  bool archived;
  Day createdOn;

  LensBox({
    this.id,
    required this.plan,
    required this.durationDays,
    required this.kind,
    this.brand = '',
    this.sph = '',
    this.cyl = '',
    this.axis = '',
    this.add = '',
    this.bc = '',
    this.dia = '',
    this.color = '',
    required this.totalLenses,
    required this.eyes,
    this.archived = false,
    required this.createdOn,
  });

  bool get isDaily => plan == WearPlan.daily;

  bool serves(Eye e) => eyes.contains(e.code);

  String get title => '${plan.label} · ${kind.label}';

  /// Etikette görünen kısa numara satırı, örn. "−2.50 · BC 8.6".
  String get specLine {
    final parts = <String>[];
    switch (kind) {
      case LensKind.spherical:
        if (sph.isNotEmpty) parts.add(_sign(sph));
        break;
      case LensKind.toric:
        if (sph.isNotEmpty) parts.add('SPH ${_sign(sph)}');
        if (cyl.isNotEmpty) parts.add('CYL ${_sign(cyl)}');
        if (axis.isNotEmpty) parts.add('AX $axis');
        break;
      case LensKind.multifocal:
        if (sph.isNotEmpty) parts.add(_sign(sph));
        if (add.isNotEmpty) parts.add('ADD $add');
        break;
      case LensKind.colored:
        if (color.isNotEmpty) parts.add(color);
        if (sph.isNotEmpty) parts.add(_sign(sph));
        break;
    }
    if (bc.isNotEmpty) parts.add('BC $bc');
    if (dia.isNotEmpty && kind != LensKind.toric) parts.add('DIA $dia');
    return parts.join(' · ');
  }

  /// Kartta yer kısıtlıyken: "−2.50" ya da "SPH −1.75".
  String get shortSpec {
    if (kind == LensKind.colored && color.isNotEmpty) return color;
    if (sph.isEmpty) return '';
    return kind == LensKind.toric ? 'T ${_sign(sph)}' : _sign(sph);
  }

  static String _sign(String v) {
    final t = v.trim().replaceAll(',', '.');
    if (t.startsWith('-') || t.startsWith('−')) return '−${t.substring(1)}';
    if (t.startsWith('+')) return t;
    if (t == '0' || t == '0.00') return t;
    return t;
  }

  Map<String, Object?> toMap() => {
        'id': id,
        'plan': plan.name,
        'durationDays': durationDays,
        'kind': kind.name,
        'brand': brand,
        'sph': sph,
        'cyl': cyl,
        'axis': axis,
        'addPower': add,
        'bc': bc,
        'dia': dia,
        'color': color,
        'totalLenses': totalLenses,
        'eyes': eyes,
        'archived': archived ? 1 : 0,
        'createdOn': createdOn.key,
      };

  factory LensBox.fromMap(Map<String, Object?> m) => LensBox(
        id: m['id'] as int?,
        plan: wearPlanFromName(m['plan'] as String),
        durationDays: m['durationDays'] as int,
        kind: lensKindFromName(m['kind'] as String),
        brand: (m['brand'] as String?) ?? '',
        sph: (m['sph'] as String?) ?? '',
        cyl: (m['cyl'] as String?) ?? '',
        axis: (m['axis'] as String?) ?? '',
        add: (m['addPower'] as String?) ?? '',
        bc: (m['bc'] as String?) ?? '',
        dia: (m['dia'] as String?) ?? '',
        color: (m['color'] as String?) ?? '',
        totalLenses: m['totalLenses'] as int,
        eyes: m['eyes'] as String,
        archived: (m['archived'] as int? ?? 0) == 1,
        createdOn: Day.parse(m['createdOn'] as String),
      );
}

/// Kutudan çıkarılıp takılmaya başlanan lens (tek göz).
class LensPackage {
  int? id;
  Eye eye;
  int boxId;

  /// Kullanım süresi (gün). Günlük lenste 1.
  int durationDays;
  bool isDaily;
  Day openedOn;

  /// Paketin son kullanım günü; aktif pakette null.
  Day? closedOn;

  /// "İkisi" seçilerek birlikte açılan iki paketin ortak anahtarı.
  String? groupId;

  LensPackage({
    this.id,
    required this.eye,
    required this.boxId,
    required this.durationDays,
    required this.isDaily,
    required this.openedOn,
    this.closedOn,
    this.groupId,
  });

  bool get isActive => closedOn == null;

  /// Son kullanım günü (süre içindeki son gün).
  Day get lastDay => openedOn.addDays(durationDays - 1);

  Map<String, Object?> toMap() => {
        'id': id,
        'eye': eye.code,
        'boxId': boxId,
        'durationDays': durationDays,
        'isDaily': isDaily ? 1 : 0,
        'openedOn': openedOn.key,
        'closedOn': closedOn?.key,
        'groupId': groupId,
      };

  factory LensPackage.fromMap(Map<String, Object?> m) => LensPackage(
        id: m['id'] as int?,
        eye: eyeFromCode(m['eye'] as String),
        boxId: m['boxId'] as int,
        durationDays: m['durationDays'] as int,
        isDaily: (m['isDaily'] as int? ?? 0) == 1,
        openedOn: Day.parse(m['openedOn'] as String),
        closedOn: m['closedOn'] == null ? null : Day.parse(m['closedOn'] as String),
        groupId: m['groupId'] as String?,
      );
}

/// Bir paketin bir günü: taktım / takmadım; otomatik dolduysa auto = true.
class DayMark {
  final int packageId;
  final Day day;
  final bool worn;
  final bool auto;

  const DayMark({
    required this.packageId,
    required this.day,
    required this.worn,
    required this.auto,
  });

  Map<String, Object?> toMap() => {
        'packageId': packageId,
        'day': day.key,
        'worn': worn ? 1 : 0,
        'auto': auto ? 1 : 0,
      };

  factory DayMark.fromMap(Map<String, Object?> m) => DayMark(
        packageId: m['packageId'] as int,
        day: Day.parse(m['day'] as String),
        worn: (m['worn'] as int) == 1,
        auto: (m['auto'] as int) == 1,
      );
}

/// Kullanıcı ayarları. Veritabanında anahtar–değer olarak saklanır.
class Settings {
  bool defaultWorn;
  int reminderHour;
  int reminderMinute;
  bool alertThreeDays;
  bool alertExpired;
  bool alertStock;

  /// 'system' | 'light' | 'dark'
  String theme;

  /// Ana ekrandaki otomatik gün satırının en son kapatıldığı gün.
  String autoNoticeSeen;

  Settings({
    this.defaultWorn = true,
    this.reminderHour = 21,
    this.reminderMinute = 0,
    this.alertThreeDays = true,
    this.alertExpired = true,
    this.alertStock = true,
    this.theme = 'system',
    this.autoNoticeSeen = '',
  });

  Map<String, String> toMap() => {
        'defaultWorn': defaultWorn ? '1' : '0',
        'reminderHour': '$reminderHour',
        'reminderMinute': '$reminderMinute',
        'alertThreeDays': alertThreeDays ? '1' : '0',
        'alertExpired': alertExpired ? '1' : '0',
        'alertStock': alertStock ? '1' : '0',
        'theme': theme,
        'autoNoticeSeen': autoNoticeSeen,
      };

  factory Settings.fromMap(Map<String, String> m) => Settings(
        defaultWorn: (m['defaultWorn'] ?? '1') == '1',
        reminderHour: int.tryParse(m['reminderHour'] ?? '') ?? 21,
        reminderMinute: int.tryParse(m['reminderMinute'] ?? '') ?? 0,
        alertThreeDays: (m['alertThreeDays'] ?? '1') == '1',
        alertExpired: (m['alertExpired'] ?? '1') == '1',
        alertStock: (m['alertStock'] ?? '1') == '1',
        theme: m['theme'] ?? 'system',
        autoNoticeSeen: m['autoNoticeSeen'] ?? '',
      );

  String get reminderLabel =>
      '${reminderHour.toString().padLeft(2, '0')}:${reminderMinute.toString().padLeft(2, '0')}';
}
