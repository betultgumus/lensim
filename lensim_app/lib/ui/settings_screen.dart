import 'dart:convert';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../models/models.dart';
import '../state/app_state.dart';
import 'theme.dart';
import 'widgets.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final st = s.settings;

    Future<void> update(void Function(Settings) change) async {
      change(st);
      await s.saveSettings(st);
    }

    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
        children: [
          Text('Ayarlar', style: LensType.text(size: 28, weight: FontWeight.w800, color: c.ink)),
          const SizedBox(height: 22),
          const SectionLabel('CEVAP VERMEDİĞİM GÜNLER'),
          Segmented<bool>(
            values: const [true, false],
            labels: const ['Taktım say', 'Takmadım say'],
            selected: st.defaultWorn,
            onChanged: (v) => update((x) => x.defaultWorn = v),
          ),
          const SizedBox(height: 8),
          Text(
            'Cevap vermediğin gün gece 02:00\'de bu seçimle dolar ve takvimde turuncu görünür. '
            'Bu ayar yalnızca bundan sonraki günleri etkiler.',
            style: LensType.text(size: 14, color: c.muted, height: 1.4),
          ),
          const SizedBox(height: 24),
          const SectionLabel('BİLDİRİMLER'),
          SoftCard(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                InkWell(
                  onTap: () async {
                    final t = await showTimePicker(
                      context: context,
                      initialTime: TimeOfDay(hour: st.reminderHour, minute: st.reminderMinute),
                      helpText: 'Günlük soru saati',
                    );
                    if (t != null) {
                      await update((x) {
                        x.reminderHour = t.hour;
                        x.reminderMinute = t.minute;
                      });
                    }
                  },
                  child: SizedBox(
                    height: 64,
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Günlük soru', style: LensType.text(size: 16, weight: FontWeight.w600, color: c.ink)),
                              Text('Bugün lens taktın mı?', style: LensType.text(size: 13, color: c.muted)),
                            ],
                          ),
                        ),
                        Text(st.reminderLabel,
                            style: LensType.mono(size: 18, weight: FontWeight.w600, color: c.blueDeep)),
                      ],
                    ),
                  ),
                ),
                Divider(height: 1, color: c.tint),
                SwitchRow(
                  label: 'Bitmeden 3 gün önce',
                  value: st.alertThreeDays,
                  onChanged: (v) => update((x) => x.alertThreeDays = v),
                ),
                Divider(height: 1, color: c.tint),
                SwitchRow(
                  label: 'Süre dolunca (bir kez)',
                  value: st.alertExpired,
                  onChanged: (v) => update((x) => x.alertExpired = v),
                ),
                Divider(height: 1, color: c.tint),
                SwitchRow(
                  label: 'Kutuda lens kalmayınca',
                  value: st.alertStock,
                  onChanged: (v) => update((x) => x.alertStock = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const SectionLabel('YEREL YEDEK'),
          SoftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Hesap veya internet gerekmez. Kayıtların bu telefonda kalır; bulut eşitlemesi yoktur. '
                  'Yedek yalnızca sen dosyaya kaydettiğinde oluşturulur.',
                  style: LensType.text(size: 15, color: c.ink),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _export(context, s),
                        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                        child: const Text('Yerel .json yedeği kaydet'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _import(context, s),
                        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                        child: const Text('Yedekten yükle'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const SectionLabel('GÖRÜNÜM'),
          Segmented<String>(
            values: const ['system', 'light', 'dark'],
            labels: const ['Sistem', 'Açık', 'Koyu'],
            selected: st.theme,
            height: 44,
            onChanged: (v) => update((x) => x.theme = v),
          ),
          const SizedBox(height: 28),
          Text('Lensim 1.0 · tavsiye vermez, yalnızca sayar',
              textAlign: TextAlign.center, style: LensType.mono(size: 13, color: c.muted)),
        ],
      ),
    );
  }

  Future<void> _export(BuildContext context, AppState s) async {
    try {
      final text = await s.exportJson();
      final path = await FilePicker.platform.saveFile(
        dialogTitle: 'Yedeği kaydet',
        fileName: 'lensim-yedek-${s.today.key}.json',
        bytes: Uint8List.fromList(utf8.encode(text)),
      );
      if (context.mounted && path != null) showLensSnack(context, 'Yedek kaydedildi.');
    } catch (e) {
      if (context.mounted) showLensSnack(context, 'Yedek kaydedilemedi.');
    }
  }

  Future<void> _import(BuildContext context, AppState s) async {
    try {
      final res = await FilePicker.platform.pickFiles(type: FileType.any, withData: true);
      final bytes = res?.files.single.bytes;
      if (bytes == null || !context.mounted) return;
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Yedek yüklensin mi?'),
          content: const Text('Telefondaki tüm Lensim kayıtları bu yedekle değiştirilir.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Vazgeç')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yükle')),
          ],
        ),
      );
      if (ok != true) return;
      await s.importJson(utf8.decode(bytes));
      if (context.mounted) showLensSnack(context, 'Yedek yüklendi.');
    } catch (e) {
      if (context.mounted) showLensSnack(context, 'Bu dosya yüklenemedi.');
    }
  }
}
