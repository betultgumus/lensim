import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'state/app_state.dart';
import 'ui/history_screen.dart';
import 'ui/home_screen.dart';
import 'ui/settings_screen.dart';
import 'ui/theme.dart';

class LensimApp extends StatefulWidget {
  const LensimApp({super.key, required this.state});
  final AppState state;

  @override
  State<LensimApp> createState() => _LensimAppState();
}

class _LensimAppState extends State<LensimApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Uygulamaya geri dönülünce (gün değişmiş ya da bildirimden cevap verilmiş olabilir) yenile.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) widget.state.refresh();
  }

  @override
  Widget build(BuildContext context) {
    return AppScope(
      state: widget.state,
      child: ListenableBuilder(
        listenable: widget.state,
        builder: (context, _) {
          final theme = widget.state.settings.theme;
          return MaterialApp(
            title: 'Lensim',
            debugShowCheckedModeBanner: false,
            theme: buildTheme(Brightness.light),
            darkTheme: buildTheme(Brightness.dark),
            themeMode: theme == 'light'
                ? ThemeMode.light
                : theme == 'dark'
                    ? ThemeMode.dark
                    : ThemeMode.system,
            locale: const Locale('tr'),
            supportedLocales: const [Locale('tr'), Locale('en')],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            home: const _Shell(),
          );
        },
      ),
    );
  }
}

/// Alt menülü ana iskelet: Bugün · Geçmiş · Ayarlar.
class _Shell extends StatefulWidget {
  const _Shell();

  @override
  State<_Shell> createState() => _ShellState();
}

class _ShellState extends State<_Shell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.lc;
    final items = <(IconData, IconData, String)>[
      (Icons.remove_red_eye_outlined, Icons.remove_red_eye_rounded, 'Bugün'),
      (Icons.history_rounded, Icons.history_rounded, 'Geçmiş'),
      (Icons.tune_rounded, Icons.tune_rounded, 'Ayarlar'),
    ];
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [HomeScreen(), HistoryScreen(), SettingsScreen()],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: c.surface,
          border: Border(top: BorderSide(color: c.line)),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 72,
            child: Row(
              children: [
                for (var i = 0; i < items.length; i++)
                  Expanded(
                    child: Semantics(
                      selected: i == _index,
                      button: true,
                      child: InkWell(
                        onTap: () => setState(() => _index = i),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(i == _index ? items[i].$2 : items[i].$1,
                                color: i == _index ? c.blueDeep : c.muted, size: 24),
                            const SizedBox(height: 4),
                            Text(
                              items[i].$3,
                              style: LensType.text(
                                size: 13,
                                weight: i == _index ? FontWeight.w700 : FontWeight.w500,
                                color: i == _index ? c.blueDeep : c.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
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
