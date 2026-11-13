import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import '../core/day.dart';
import '../models/models.dart';

/// Telefondaki SQLite veritabanı. Uygulama internetsiz çalışır; her şey burada.
class LensDb {
  LensDb._(this.db);
  final Database db;

  static Future<LensDb> open() async {
    final dir = await getDatabasesPath();
    final db = await openDatabase(
      p.join(dir, 'lensim.db'),
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE boxes(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan TEXT NOT NULL,
            durationDays INTEGER NOT NULL,
            kind TEXT NOT NULL,
            brand TEXT, sph TEXT, cyl TEXT, axis TEXT, addPower TEXT,
            bc TEXT, dia TEXT, color TEXT,
            totalLenses INTEGER NOT NULL,
            eyes TEXT NOT NULL,
            archived INTEGER NOT NULL DEFAULT 0,
            createdOn TEXT NOT NULL
          )''');
        await db.execute('''
          CREATE TABLE packages(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            eye TEXT NOT NULL,
            boxId INTEGER NOT NULL,
            durationDays INTEGER NOT NULL,
            isDaily INTEGER NOT NULL,
            openedOn TEXT NOT NULL,
            closedOn TEXT,
            groupId TEXT
          )''');
        await db.execute('''
          CREATE TABLE marks(
            packageId INTEGER NOT NULL,
            day TEXT NOT NULL,
            worn INTEGER NOT NULL,
            auto INTEGER NOT NULL,
            PRIMARY KEY(packageId, day)
          )''');
        await db.execute('CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)');
      },
    );
    return LensDb._(db);
  }

  // ---- Kutular ----
  Future<List<LensBox>> boxes() async =>
      (await db.query('boxes', orderBy: 'id DESC')).map(LensBox.fromMap).toList();

  Future<int> insertBox(LensBox b) {
    final m = b.toMap()..remove('id');
    return db.insert('boxes', m);
  }

  Future<void> updateBox(LensBox b) =>
      db.update('boxes', b.toMap(), where: 'id = ?', whereArgs: [b.id]);

  // ---- Paketler ----
  Future<List<LensPackage>> packages() async =>
      (await db.query('packages', orderBy: 'openedOn DESC, id DESC'))
          .map(LensPackage.fromMap)
          .toList();

  Future<int> insertPackage(LensPackage pk) {
    final m = pk.toMap()..remove('id');
    return db.insert('packages', m);
  }

  Future<void> updatePackage(LensPackage pk) =>
      db.update('packages', pk.toMap(), where: 'id = ?', whereArgs: [pk.id]);

  Future<void> deletePackage(int id) async {
    await db.delete('marks', where: 'packageId = ?', whereArgs: [id]);
    await db.delete('packages', where: 'id = ?', whereArgs: [id]);
  }

  // ---- Gün kayıtları ----
  Future<List<DayMark>> marks() async =>
      (await db.query('marks')).map(DayMark.fromMap).toList();

  Future<void> setMark(int packageId, Day day, {required bool worn, required bool auto}) =>
      db.insert(
        'marks',
        DayMark(packageId: packageId, day: day, worn: worn, auto: auto).toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

  Future<void> deleteMark(int packageId, Day day) =>
      db.delete('marks', where: 'packageId = ? AND day = ?', whereArgs: [packageId, day.key]);

  /// Paketin aralığı dışına düşen kayıtları siler (açılış tarihi değişince).
  Future<void> trimMarks(LensPackage pk) async {
    await db.delete('marks', where: 'packageId = ? AND day < ?', whereArgs: [pk.id, pk.openedOn.key]);
    if (pk.closedOn != null) {
      await db.delete('marks', where: 'packageId = ? AND day > ?', whereArgs: [pk.id, pk.closedOn!.key]);
    }
  }

  // ---- Ayarlar ----
  Future<Settings> settings() async {
    final rows = await db.query('settings');
    return Settings.fromMap({for (final r in rows) r['key'] as String: r['value'] as String});
  }

  Future<void> saveSettings(Settings s) async {
    final batch = db.batch();
    s.toMap().forEach((k, v) {
      batch.insert('settings', {'key': k, 'value': v}, conflictAlgorithm: ConflictAlgorithm.replace);
    });
    await batch.commit(noResult: true);
  }

  // ---- Yedek ----
  Future<Map<String, Object?>> exportAll() async => {
        'app': 'lensim',
        'version': 1,
        'boxes': await db.query('boxes'),
        'packages': await db.query('packages'),
        'marks': await db.query('marks'),
        'settings': await db.query('settings'),
      };

  Future<void> importAll(Map<String, dynamic> data) async {
    if (data['app'] != 'lensim') {
      throw const FormatException('Bu dosya bir Lensim yedeği değil.');
    }
    await db.transaction((txn) async {
      for (final t in ['marks', 'packages', 'boxes', 'settings']) {
        await txn.delete(t);
      }
      for (final t in ['boxes', 'packages', 'marks', 'settings']) {
        final rows = (data[t] as List?) ?? const [];
        for (final r in rows) {
          await txn.insert(t, Map<String, Object?>.from(r as Map));
        }
      }
    });
  }
}
