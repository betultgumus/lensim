# Lensim

Lensim is an Expo / React Native contact lens tracking app for Android, iOS, and web preview. Guest use works locally without an account; optional Google or email/password accounts provide cloud backup and device restore when configured.

## Run the app

Requires Node.js and npm.

```sh
npm ci
npm run web:dev
```

For checks:

```sh
npm run typecheck
npm test
```

The web preview stores data in this browser. Native Android notifications and widgets require an Android build/device.

For optional account setup, see [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md). The cloud account service remains unavailable until project settings, database migration, Google provider, and account deletion function are configured.
