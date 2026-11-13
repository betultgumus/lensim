import 'dart:ui' show DartPluginRegistrant;

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../core/day.dart';
import '../data/db.dart';

/// Bildirim cevap düğmeleri.
const String actionWorn = 'worn';
const String actionNotWorn = 'not_worn';

/// Günlük soru bildiriminin payload'ı: "q|YYYY-MM-DD".
String questionPayload(Day d) => 'q|${d.key}';

Day? dayFromPayload(String? payload) {
  if (payload == null || !payload.startsWith('q|')) return null;
  try {
    return Day.parse(payload.substring(2));
  } catch (_) {
    return null;
  }
}

/// Bildirimdeki "Taktım / Takmadım" cevabını veritabanına yazar.
/// Hem uygulama açıkken hem de arka planda (uygulama kapalıyken) kullanılır.
Future<bool> applyNotificationAnswer(LensDb db, NotificationResponse r) async {
  final day = dayFromPayload(r.payload);
  final id = r.actionId;
  if (day == null || (id != actionWorn && id != actionNotWorn)) return false;
  final packages = await db.packages();
  for (final p in packages) {
    final activeThatDay = !day.isBefore(p.openedOn) && (p.closedOn == null || !day.isAfter(p.closedOn!));
    if (p.id == null || !activeThatDay) continue;
    await db.setMark(p.id!, day, worn: id == actionWorn, auto: false);
  }
  return true;
}

/// Uygulama kapalıyken bildirim düğmesine basılınca Android bu fonksiyonu çağırır.
@pragma('vm:entry-point')
void notificationTapBackground(NotificationResponse response) async {
  DartPluginRegistrant.ensureInitialized();
  final db = await LensDb.open();
  await applyNotificationAnswer(db, response);
}

class Notifier {
  Notifier._();

  static final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  static bool _ready = false;

  static final _questionDetails = NotificationDetails(
    android: AndroidNotificationDetails(
      'daily_question',
      'Günlük soru',
      channelDescription: 'Her gün lens taktın mı diye sorar',
      importance: Importance.high,
      priority: Priority.high,
      icon: 'ic_stat_lens',
      actions: <AndroidNotificationAction>[
        AndroidNotificationAction(actionWorn, 'Taktım'),
        AndroidNotificationAction(actionNotWorn, 'Takmadım'),
      ],
    ),
    iOS: DarwinNotificationDetails(categoryIdentifier: 'daily_question'),
  );

  static final _alertDetails = NotificationDetails(
    android: AndroidNotificationDetails(
      'lens_alerts',
      'Lens uyarıları',
      channelDescription: 'Süre bitmek üzereyken, süre dolunca ve kutu boşalınca',
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
      icon: 'ic_stat_lens',
    ),
    iOS: DarwinNotificationDetails(),
  );

  static Future<void> init(void Function(NotificationResponse) onResponse) async {
    tzdata.initializeTimeZones();
    final settings = InitializationSettings(
      android: const AndroidInitializationSettings('ic_stat_lens'),
      iOS: DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
        notificationCategories: <DarwinNotificationCategory>[
          DarwinNotificationCategory(
            'daily_question',
            actions: <DarwinNotificationAction>[
              DarwinNotificationAction.plain(actionWorn, 'Taktım'),
              DarwinNotificationAction.plain(actionNotWorn, 'Takmadım'),
            ],
          ),
        ],
      ),
    );
    try {
      await _plugin.initialize(
        settings,
        onDidReceiveNotificationResponse: onResponse,
        onDidReceiveBackgroundNotificationResponse: notificationTapBackground,
      );
      _ready = true;
    } catch (_) {
      _ready = false;
    }
  }

  /// Android 13+ bildirim izni. İlk paket kaydedildikten sonra istenir.
  static Future<bool> requestPermission() async {
    if (!_ready) return false;
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android != null) {
      return await android.requestNotificationsPermission() ?? false;
    }
    final ios = _plugin.resolvePlatformSpecificImplementation<
        IOSFlutterLocalNotificationsPlugin>();
    if (ios != null) {
      return await ios.requestPermissions(alert: true, badge: false, sound: true) ?? false;
    }
    return false;
  }

  static Future<void> cancelAll() async {
    if (!_ready) return;
    await _plugin.cancelAll();
  }

  static Future<void> cancel(int id) async {
    if (!_ready) return;
    await _plugin.cancel(id);
  }

  static Future<void> scheduleQuestion({required int id, required DateTime at, required Day day}) =>
      _schedule(id, 'Bugün lens taktın mı?', 'Cevabını buradan ver, uygulamayı açmana gerek yok.',
          at, _questionDetails, questionPayload(day));

  static Future<void> scheduleAlert({
    required int id,
    required DateTime at,
    required String title,
    required String body,
  }) =>
      _schedule(id, title, body, at, _alertDetails, 'alert');

  static Future<void> showAlert({required int id, required String title, required String body}) async {
    if (!_ready) return;
    try {
      await _plugin.show(id, title, body, _alertDetails, payload: 'alert');
    } catch (_) {}
  }

  static Future<void> _schedule(
    int id,
    String title,
    String body,
    DateTime at,
    NotificationDetails details,
    String payload,
  ) async {
    if (!_ready) return;
    try {
      await _plugin.zonedSchedule(
        id,
        title,
        body,
        tz.TZDateTime.from(at, tz.UTC),
        details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        payload: payload,
      );
    } catch (_) {
      // Zamanlama başarısız olursa uygulama çalışmaya devam eder.
    }
  }
}
