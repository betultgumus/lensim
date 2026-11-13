import 'package:flutter/material.dart';

import '../core/day.dart';
import '../state/app_state.dart';
import 'theme.dart';

/// Otomatik doldurulmuş günlerin kontrol listesi.
Future<void> showAutoDaysSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: context.lc.surface,
    builder: (_) => const _AutoDaysSheet(),
  );
}

class _AutoDaysSheet extends StatelessWidget {
  const _AutoDaysSheet();

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final c = context.lc;
    final days = s.autoDays();
    final defaultLabel = s.settings.defaultWorn ? 'taktım' : 'takmadım';

    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Otomatik doldurulan günler',
                  style: LensType.text(size: 22, weight: FontWeight.w700, color: c.ink)),
              const SizedBox(height: 6),
              Text(
                days.isEmpty
                    ? 'Kontrol edilecek gün kalmadı.'
                    : 'Bu günlerde cevap vermediğin için “$defaultLabel” sayıldı. Doğrusunu seç.',
                style: LensType.text(size: 15, color: c.muted, height: 1.4),
              ),
              if (days.length > 3) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          for (final d in days) {
                            await s.answerAutoDay(d, worn: true);
                          }
                        },
                        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                        child: const Text('Hepsi taktım'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          for (final d in days) {
                            await s.answerAutoDay(d, worn: false);
                          }
                        },
                        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                        child: const Text('Hepsi takmadım'),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 8),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: days.length,
                  separatorBuilder: (_, __) => Divider(height: 1, color: c.tint),
                  itemBuilder: (context, i) {
                    final d = days[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(dayMonthWeekday(d),
                                style: LensType.text(size: 16, weight: FontWeight.w600, color: c.ink)),
                          ),
                          _SmallChoice(
                            label: 'Taktım',
                            filled: true,
                            onTap: () => s.answerAutoDay(d, worn: true),
                          ),
                          const SizedBox(width: 6),
                          _SmallChoice(
                            label: 'Takmadım',
                            filled: false,
                            onTap: () => s.answerAutoDay(d, worn: false),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SmallChoice extends StatelessWidget {
  const _SmallChoice({required this.label, required this.filled, required this.onTap});
  final String label;
  final bool filled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    return SizedBox(
      height: 44,
      child: filled
          ? FilledButton(
              onPressed: onTap,
              style: FilledButton.styleFrom(backgroundColor: c.blue),
              child: Text(label),
            )
          : OutlinedButton(
              onPressed: onTap,
              style: OutlinedButton.styleFrom(
                foregroundColor: c.navy,
                side: BorderSide(color: c.blue, width: 1.5),
              ),
              child: Text(label),
            ),
    );
  }
}
