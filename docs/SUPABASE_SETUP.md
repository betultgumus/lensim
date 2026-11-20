# Lensim account and cloud backup setup

The app remains usable as a guest with no account service configured. Native app records stay in SQLite; the web preview uses IndexedDB. Account sign-in and cloud backup activate only after the steps below.

## Supabase project

1. Create a Supabase project in a region selected for Lensim's users and data-residency requirements.
2. Apply `supabase/migrations/202611200001_user_backups.sql` using the Supabase CLI or SQL editor.
3. Confirm both backup tables have RLS enabled and the `save_lensim_backup` function is callable only by authenticated users.
4. Configure email/password in Authentication. Decide email confirmation and sender settings; the app handles the confirmation deep link at `lenstakip://auth/callback`.
5. Enable Google in Authentication → Sign In / Providers. Create a Google OAuth web client; use Supabase's displayed callback URL as Google's authorized redirect URI. Add `lenstakip://auth/callback` to Supabase's allowed redirect URLs. Keep the Google client secret in Supabase only; never place it in the Expo app.
6. Apply `supabase/migrations/202611200002_account_deletion.sql`. It adds authenticated-user RPCs for deleting only the caller's cloud backup or account. Validate account deletion in a non-production project before release.
   Optional fallback: `supabase functions deploy delete-account`. The app calls the RPC first and the Edge Function only if the RPC fails (for example if the project does not allow deleting from `auth.users` in SQL). The function uses the Auth admin API with the server-only service-role key and derives the user from the caller's token.
7. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as Expo public build environment variables. A public publishable key is expected in the app; service-role keys are server-only.
8. Rebuild the Android development/preview app after changing native/deep-link configuration. Email confirmation and Google sign-in require a development or standalone build, not Expo Go.

## Data behavior

- Guest use needs no network and is never gated by account screens.
- Signing in alone never uploads records. The user must separately enable cloud backup after reviewing the data list. Only then does first-time sync merge the current device state into that account's backup.
- On another device with empty local data, the account snapshot is restored locally.
- If both sides already contain records, the app merges stable record IDs, validates the whole resulting state, and uses the current device's answer for a duplicate day. Different physical boxes that share a name are renamed with a numbered suffix; package-to-box IDs remain unchanged. Before writing the merge, the old cloud snapshot is archived.
- A failed validation or failed cloud write leaves the local SQLite state unchanged. A failed network sync shows an error and can be retried from the account screen.
- Signing out with cloud backup on first syncs, then clears account data from the device; the cloud copy remains for the next sign-in. With cloud backup off, signing out keeps the records on the phone as guest records.
- Cloud upload starts only after the signed-in person turns on cloud backup with a separate, unticked confirmation (`src/domain/cloudConsent.ts`). Signing in alone uploads nothing. Turning it off stops uploads; "Buluttaki kopyayı sil" calls `delete_lensim_cloud_data()`.
- Account deletion (`Hesabımı sil`) deletes the backup, archived copies and the Auth user, then verifies that the token no longer resolves to a user. Only then does the app report success. The person chooses whether this phone's records stay as guest records or are deleted too.
- Research-sharing preference is local only. No research, analytics, advertising, or ad SDK data is sent in this release.

## Release gate

The repo contains implementation and migrations, not a configured production project. Before Play Store submission, configure the project/provider, publish the account deletion function, test Google and email flows on a physical Android device, test guest migration and a second-device restore, and update the public privacy policy with the final provider, hosting region, retention, and support details. Do not ship a build with placeholder project keys.
