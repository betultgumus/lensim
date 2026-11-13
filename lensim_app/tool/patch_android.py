"""`flutter create` ile üretilen Android dosyalarına Lensim'in ihtiyaçlarını ekler.

- Bildirim izinleri ve flutter_local_notifications alıcıları (AndroidManifest.xml)
- Uygulama adı: Lensim
- Core library desugaring (flutter_local_notifications için şart)
- Bildirim simgesi (ic_stat_lens) ve R8 koruma kuralları

Script tekrar tekrar çalıştırılabilir; eklediğini ikinci kez eklemez.
Çalıştırma: python3 tool/patch_android.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "android" / "app"
MANIFEST = APP / "src" / "main" / "AndroidManifest.xml"
DESUGAR = "com.android.tools:desugar_jdk_libs:2.1.4"

PERMISSIONS = """
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
    <uses-permission android:name="android.permission.VIBRATE"/>
"""

RECEIVERS = """
        <receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ActionBroadcastReceiver" />
        <receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationReceiver" />
        <receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationBootReceiver">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED"/>
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED"/>
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="com.htc.intent.action.QUICKBOOT_POWERON"/>
            </intent-filter>
        </receiver>
"""

ICON = """<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M1.6,17.4 C4.8,7.0 19.2,7.0 22.4,17.4 C18.8,11.4 5.2,11.4 1.6,17.4 Z" />
</vector>
"""

PROGUARD = """# flutter_local_notifications zamanlanmış bildirimleri Gson ile saklar.
-keep class com.dexterous.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.reflect.TypeToken { *; }
-keep class * extends com.google.gson.reflect.TypeToken
"""


def fail(msg):
    print("HATA:", msg)
    sys.exit(1)


def patch_manifest():
    if not MANIFEST.exists():
        fail(f"{MANIFEST} yok. Önce `flutter create --platforms=android .` çalıştırın.")
    s = MANIFEST.read_text(encoding="utf-8")
    if "POST_NOTIFICATIONS" not in s:
        m = re.search(r"<manifest[^>]*>", s)
        if not m:
            fail("manifest etiketi bulunamadı")
        s = s[: m.end()] + PERMISSIONS + s[m.end():]
    if "ScheduledNotificationReceiver" not in s:
        i = s.rfind("</application>")
        if i < 0:
            fail("</application> bulunamadı")
        s = s[:i] + RECEIVERS + "    " + s[i:]
    s = re.sub(r'android:label="[^"]*"', 'android:label="Lensim"', s, count=1)
    MANIFEST.write_text(s, encoding="utf-8")
    print("manifest tamam")


def patch_gradle():
    kts = APP / "build.gradle.kts"
    groovy = APP / "build.gradle"
    if kts.exists():
        s = kts.read_text(encoding="utf-8")
        if "isCoreLibraryDesugaringEnabled" not in s:
            s, n = re.subn(r"compileOptions\s*\{", "compileOptions {\n        isCoreLibraryDesugaringEnabled = true", s, count=1)
            if n == 0:
                fail("build.gradle.kts içinde compileOptions bulunamadı")
        if DESUGAR not in s:
            s += f'\ndependencies {{\n    coreLibraryDesugaring("{DESUGAR}")\n}}\n'
        kts.write_text(s, encoding="utf-8")
        print("build.gradle.kts tamam")
    elif groovy.exists():
        s = groovy.read_text(encoding="utf-8")
        if "coreLibraryDesugaringEnabled" not in s:
            s, n = re.subn(r"compileOptions\s*\{", "compileOptions {\n        coreLibraryDesugaringEnabled true", s, count=1)
            if n == 0:
                fail("build.gradle içinde compileOptions bulunamadı")
        if DESUGAR not in s:
            s += f"\ndependencies {{\n    coreLibraryDesugaring '{DESUGAR}'\n}}\n"
        groovy.write_text(s, encoding="utf-8")
        print("build.gradle tamam")
    else:
        fail("android/app/build.gradle(.kts) bulunamadı")


def write_resources():
    drawable = APP / "src" / "main" / "res" / "drawable"
    drawable.mkdir(parents=True, exist_ok=True)
    (drawable / "ic_stat_lens.xml").write_text(ICON, encoding="utf-8")
    (APP / "proguard-rules.pro").write_text(PROGUARD, encoding="utf-8")
    print("simge ve proguard tamam")


if __name__ == "__main__":
    patch_manifest()
    patch_gradle()
    write_resources()
