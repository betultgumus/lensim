# Lensim

Lensim is a contact lens tracking app. This repository currently keeps two runnable implementations side by side:

- **Expo / React Native (repository root):** the updated UI and features from the current development work. It targets Android, iOS, and web preview.
- **Flutter (`lensim_app/`):** the existing Flutter implementation, preserved as-is.

These are separate apps with separate data stores. Choose one implementation before preparing a store release; changes made in one are not automatically copied to the other.

## Run the Expo implementation

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

## Run the Flutter implementation

Requires Flutter and Android Studio or Xcode as appropriate.

```sh
cd lensim_app
flutter pub get
flutter test
flutter run
```

See [`lensim_app/README.md`](lensim_app/README.md) for APK build steps.
