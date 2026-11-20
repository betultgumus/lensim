# Lensim v1 implementation status

This document records the Lensim product direction currently being applied to the existing Expo project. The written product rules determine behavior; the supplied screenshots guide information hierarchy and eye colors.

## Implemented in this working tree

- First launch goes directly to first-package setup without an account screen.
- Turkish setup captures eye selection, lens type, optional prescription values, duration, box stock and an optional past opening date.
- A reusable lens package consumes one spare lens at opening for each eye. A daily lens consumes stock only when a worn-day record is saved; correcting that record restores stock.
- Local state remains the source of truth in SQLite. Existing cycle records migrate to package history instead of being discarded.
- The 02:00 tracking-day boundary is shared by the home screen and missed-day completion. Missing dates are filled with the chosen default and marked automatic.
- The Today screen shows active packages only, joins both eyes opened together, provides one-tap daily tracking and exposes overdue state.
- Package detail shows the calendar and lets the user correct a selected date. History shows automatic entries and closed packages.
- A JSON export and restore screen is available; web export downloads a file. Restoring validates the whole state before replacing local records.
- The UI foundation uses larger text/tap targets, 4–8 dp card corners and flat color treatment in line with the written visual rules.
- Local reminder planning now includes active-package duration reminders and scheduled daily check-in prompts with “Taktım” / “Takmadım” actions.

## Current account direction (2026-11-20)

Lensim stores health-related data (lens use, prescriptions). Guest use remains complete and offline; account registration is optional. The planned account offers cloud backup and cross-device restore:

- First launch opens lens setup directly; a login screen never blocks core use.
- Guest records remain in local SQLite (`lens-takip.db`) and web IndexedDB (`lens-takip-web-preview`).
- Optional Google and email/password authentication uses Supabase Auth. The same local SQLite remains the native source of truth; an authenticated account stores a JSON snapshot in Postgres and restores it on another device.
- Sign-in never uploads by itself. The user must separately enable cloud backup after reviewing the data list; until then, guest records stay on the device. When enabled, stable IDs are merged; same-day answers from the current device win, and the prior cloud snapshot is archived before replacement. Invalid or conflicting state is rejected without replacing local records.
- The account service is disabled until `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, the SQL migration and provider settings are configured. No production cloud project credentials are committed.
- Backup remains a user-started local `.json` export/restore. Android OS backup is disabled (`allowBackup: false`).
- Reminders are local notifications scheduled on the device; no push token is registered.
- Research sharing remains inactive. The app stores a local preference only; it sends no research data.
- There is no advertising SDK in the current project. Guest ad placement is not implemented.
- Account deletion uses the `delete_my_lensim_account()` Supabase SQL RPC to remove the signed-in user's cloud snapshots, archived copies and auth account. Apply the second migration and validate it in the configured Supabase project before production.

## Still required before calling v1 complete

- The Android/iOS notification action flow needs acceptance on physical devices, especially after force-stop, reboot and when the app process is not running. Expo action buttons currently foreground the app so its local database can record the answer.
- Android home-screen widgets (`modules/lens-widget`, local Expo module): the existing 2×1 and 1×1 widgets remain; a separate 2×3 widget has “Taktım” / “Takmadım” buttons. Button taps write directly to the local SQLite database without opening the app. Physical-device/launcher acceptance (button actions, database reconciliation, sizes, TalkBack) is still required; iOS widget is deferred.
- Standalone box creation, unique box names, separate right/left prescriptions and native backup file-picker restore are implemented in the working tree; physical-device acceptance remains.
- English strings and iOS widget are deferred until after Android Play Store work.
- No signed APK/AAB or IPA was built in this session. Store publication and iOS are later milestones; web export is only a browser preview, not an Android app build.

## Run the local preview

With dependencies installed, run `npm run web` from the repository. It exports the web app and serves `dist-web` at `http://localhost:8082` by default. Web data is stored in that browser and does not replace the Android SQLite database.

Before release, test a local `.json` backup export and its restore on a second device. A saved file alone does not demonstrate recoverability.

## Future product ideas (outside v1)

- Optional subscription for automatic contact-lens reordering, timed from the user's package cycle. Any order must require clear opt-in and be easy to pause or cancel. Research supplier, country availability, pricing and legal requirements before planning implementation.
- While adding an eye's lens details, ask whether those details also apply to the other eye. If yes, present the pair as one shared lens setup; if no, keep each eye's brand, prescription, package and timing separate. When both opening dates are the same, their elapsed-day count should be shared/equal. Daily wear status itself remains one answer for both eyes.
