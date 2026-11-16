import type { ExpoConfig } from 'expo/config';
import release from './release.config.json';

const config: ExpoConfig = {
  owner: 'nihatkutukoglu', name: 'Lensim', slug: 'lens-takip', version: '1.0.0', scheme: 'lenstakip',
  platforms: ['ios', 'android', 'web'],
  web: { bundler: 'metro', output: 'single', name: 'Lensim' },
  orientation: 'portrait', userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  ios: { bundleIdentifier: 'com.teknova.lenstakip', supportsTablet: true, buildNumber: '1', privacyManifests: { NSPrivacyTracking: false, NSPrivacyCollectedDataTypes: [], NSPrivacyAccessedAPITypes: [{ NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1', '1C8F.1'] }] }, infoPlist: { ITSAppUsesNonExemptEncryption: false, CFBundleDevelopmentRegion: 'tr' } },
  android: {
    package: 'com.teknova.lenstakip',
    versionCode: 1,
    allowBackup: false,
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#EAF3FF' },
    blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.READ_CONTACTS', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'com.google.android.gms.permission.AD_ID'],
  },
  plugins: [
    'expo-router', 'expo-sqlite',
    ['expo-splash-screen', { image: './assets/splash.png', imageWidth: 180, backgroundColor: '#EAF3FF' }],
    ['expo-notifications', { icon: './assets/notification.png', color: '#0754C8' }],
  ],
  updates: { enabled: false },
  extra: { release, eas: { projectId: '8a597028-8c18-42e9-9e8b-52bb70b8fbce' } },
  experiments: { typedRoutes: false },
};
export default config;
