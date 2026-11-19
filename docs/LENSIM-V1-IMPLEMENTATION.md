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

## Privacy requirement: no account, no cloud

Lensim stores health-related data (lens use, prescriptions), so it must work without an account, sign-in or network connection. This is a product rule, not a missing feature:

- First launch opens the lens setup directly; there is no sign-up or sign-in screen.
- Records live only on the device: SQLite (`lens-takip.db`) in the native app, IndexedDB (`lens-takip-web-preview`) in the web preview's browser.
- Do not add Firebase, OAuth, analytics or any other service that receives lens or prescription data, and do not add account or sync infrastructure.
- Backup is a user-started local `.json` export/restore. There is no automatic cloud backup; Android app backup is disabled (`allowBackup: false`).
- Reminders are local notifications scheduled on the device; no push token is registered.
- `tests/offline-privacy.test.ts` guards these rules.

## Still required before calling v1 complete

- The Android/iOS notification action flow needs acceptance on physical devices, especially after force-stop, reboot and when the app process is not running. Expo action buttons currently foreground the app so its local database can record the answer.
- Android home-screen widget (`modules/lens-widget`, local Expo module): reads the open packages through `src/domain/widget.ts` (same pairing, day count and owl thresholds as the home screen) and shows three looks — fresh (blue), change near (lavender), overdue (pink) — plus an empty card. The app writes ~62 precomputed days on every save, day change and resume; the widget switches days at 02.00 by itself and opens `/cycle` on tap. Still to do: acceptance on physical devices and launchers (sizes, TalkBack), a widget “Taktım” action and an iOS widget.
- New-box management, separate right/left prescriptions, full backup file-picker restore on native platforms and English strings remain follow-up work.
- No signed APK/AAB or IPA was built in this session. Store publication and iOS are later milestones; web export is only a browser preview, not an Android app build.

## Run the local preview

With dependencies installed, run `npm run web` from the repository. It exports the web app and serves `dist-web` at `http://localhost:8082` by default. Web data is stored in that browser and does not replace the Android SQLite database.

Before release, test a local `.json` backup export and its restore on a second device. A saved file alone does not demonstrate recoverability.

## Future product ideas (outside v1)

- Optional subscription for automatic contact-lens reordering, timed from the user's package cycle. Any order must require clear opt-in and be easy to pause or cancel. Research supplier, country availability, pricing and legal requirements before planning implementation.
- While adding an eye's lens details, ask whether those details also apply to the other eye. If yes, present the pair as one shared lens setup; if no, keep each eye's brand, prescription, package and timing separate. When both opening dates are the same, their elapsed-day count should be shared/equal. Daily wear status itself remains one answer for both eyes.
