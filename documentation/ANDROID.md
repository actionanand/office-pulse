# Office Pulse Android Build Guide

Office Pulse uses Capacitor in GitHub Actions to package the Angular app as an Android APK and AAB. The Android project is generated in CI, so the `android/` folder is not committed.

This project uses PKCS12 format for Android release signing.

## Files

| File                                                      | Purpose                                                        |
| --------------------------------------------------------- | -------------------------------------------------------------- |
| `capacitor.config.ts`                                     | Capacitor app ID, app name, and Angular build output directory |
| `.github/workflows/android-build.yml`                     | Builds APK/AAB, signs when secrets exist, uploads artifacts    |
| `android-version.json`                                    | Stores `versionCode` and `versionName`                         |
| `scripts/bump-android-version.js`                         | Bumps Android version values                                   |
| `scripts/generate-keystore.mjs`                           | Generates a PKCS12 release keystore                            |
| `scripts/detect-keystore-format.mjs`                      | Checks whether a keystore is PKCS12                            |
| `scripts/patch-android-pip.mjs`                           | Applies Office Pulse native Android shell polish in CI         |
| `scripts/patch-android-export.mjs`                        | Adds native Android PDF export/download support                |
| `scripts/inject-env.js`                                   | Injects GitHub secrets into `src/environments/environment.ts`  |
| `src/app/services/android-logoff-notification.service.ts` | Schedules Android-only log off reminders from `/logger`        |

## Build Flow

1. Push to `main-android`.
2. GitHub Actions installs Node, Java, Android SDK, and project dependencies.
3. `scripts/inject-env.js` injects production secrets.
4. Angular builds to `dist/office-pulse/browser`.
5. Capacitor generates the Android project.
6. `scripts/patch-android-pip.mjs` applies native Android shell polish and Internet permission.
7. `scripts/patch-android-export.mjs` adds native PDF export support for downloads such as `/calendar`.
8. `@capacitor/local-notifications` provides Android-only log off reminder notifications.
9. Capacitor syncs web assets.
10. Android launcher icons are generated from `public/office_pulse.png`.
11. Gradle builds release APK and AAB.
12. If keystore secrets are present, CI signs both files.
13. Artifacts are uploaded, and release files are committed to `releases/` on `main-android`.

## GitHub Secrets

Add these in GitHub: Settings -> Secrets and variables -> Actions.

| Secret              | Required            | Purpose                                                                                                          |
| ------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `PASSWORD_HASH`     | Yes                 | SHA1 hash used by client-side login                                                                              |
| `KEYSTORE_BASE64`   | For signed builds   | Base64 encoded PKCS12 release keystore                                                                           |
| `KEYSTORE_PASSWORD` | For signed builds   | PKCS12 keystore password                                                                                         |
| `KEY_ALIAS`         | For signed builds   | Alias inside the keystore                                                                                        |
| `KEY_PASSWORD`      | Optional for PKCS12 | Set the same value as `KEYSTORE_PASSWORD` for clarity; required only for legacy JKS with a separate key password |

If signing secrets are missing, CI still creates unsigned APK/AAB artifacts for testing.

The workflow prints a clear artifact status message with emoji:

- `✅ Signed APK produced`
- `⚠️ Unsigned APK produced`
- `✅ Signed AAB produced`
- `⚠️ Unsigned AAB produced`

For AAB signing, `jarsigner` may print `The signer's certificate is self-signed.` This is expected for a private release keystore. If the log says `jar signed.` and the workflow prints `✅ Signed AAB produced`, the AAB is signed.

## App Icon

Android launcher icons are generated from `public/office_pulse.png`.

## PKCS12 Keystore

Generate once and back it up securely:

```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keyalg RSA \
  -keysize 2048 \
  -validity 36500 \
  -storepass 'YOUR_STORE_PASSWORD' \
  -keypass 'YOUR_STORE_PASSWORD' \
  -alias officepulse \
  -keystore release-keystore.jks \
  -dname "CN=Office Pulse, OU=Mobile, O=Office Pulse, L=City, ST=State, C=IN"
```

The file can be named `.jks` or `.p12`; the extension does not decide the format. Keeping `release-keystore.jks` matches the workflow.

PKCS12 uses one passphrase for the keystore and private key. The workflow detects PKCS12 and uses `KEYSTORE_PASSWORD` as the effective key password for signing. You may also set `KEY_PASSWORD` to the same value for clarity, but PKCS12 builds do not depend on it.

You can also generate a PKCS12 keystore with the included script:

```bash
npm run generate-keystore -- --password 'YOUR_STORE_PASSWORD'
```

Check the format:

```bash
keytool -list -v -keystore release-keystore.jks -storepass 'YOUR_STORE_PASSWORD'
npm run keystore:type
```

The output should include `Keystore type: PKCS12`.

Encode it for GitHub:

```bash
base64 -w 0 release-keystore.jks > keystore.b64.txt
```

Store the file content as `KEYSTORE_BASE64`. Keep the original `.jks`/`.p12` safe. Losing it means you cannot update a Play Store app signed with it.

### Migrating JKS To PKCS12

If you already generated a legacy JKS keystore, convert it:

```bash
keytool -importkeystore \
  -srckeystore release-keystore.jks \
  -destkeystore release-keystore.jks \
  -deststoretype pkcs12 \
  -srcstorepass 'YOUR_STORE_PASSWORD' \
  -deststorepass 'YOUR_STORE_PASSWORD'
```

Then verify again:

```bash
keytool -list -v -keystore release-keystore.jks -storepass 'YOUR_STORE_PASSWORD'
```

## Versioning

`android-version.json` starts as:

```json
{
  "versionCode": 1,
  "versionName": "1.0.0"
}
```

CI auto-increments `versionCode` on every `main-android` build.

Use these scripts when you want to bump the visible version name too:

```bash
npm run android:version:patch
npm run android:version:minor
npm run android:version:major
```

## Trigger A Build

```bash
git checkout main-android
git merge main
git push origin main-android
```

Outputs:

- `releases/office-pulse-release.apk`
- `releases/office-pulse-release.aab`
- Actions artifacts retained for 30 days

To create a GitHub Release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Local Android Test

Local Android setup is optional:

```bash
npm install
npm run build
npm install --no-save --package-lock=false @capacitor/cli @capacitor/core @capacitor/android @capacitor/local-notifications
npx cap add android
node scripts/patch-android-pip.mjs
node scripts/patch-android-export.mjs
npx cap sync android
npx cap open android
```

## Native PDF Export

The web app uses `window.open(...).print()` for browser PDF generation. In the Android app, `/calendar` PDF downloads use the Capacitor `OfficePulseExport` plugin generated by `scripts/patch-android-export.mjs`. The Angular app sends structured report data to the plugin, the plugin draws it directly into Android `PdfDocument` pages, writes a PDF file in the app cache, and opens Android's share/download sheet through a `FileProvider` instead of opening Chrome.

## Log Off Reminder Notifications

In the Android app, `/logger` schedules local notifications after entry is marked and the active timer exists. Reminders are scheduled at 1 hour, 30 minutes, and 15 minutes before the calculated log off time (`entryTime + defaultWorkHours`). They are cancelled when exit is marked or submitted, and rescheduled when default work hours changes. Browser/PWA usage does not schedule these notifications.

Android 13+ requires notification permission. The generated Android manifest includes `POST_NOTIFICATIONS` through `scripts/patch-android-pip.mjs`, and the app asks for runtime permission the first time reminders are scheduled.

The same Android shell patch sets the status bar to the Office Pulse header color so the top native area matches the mobile app header.

## SDK Targets

The workflow currently uses:

```yaml
MIN_SDK_VERSION: 24
TARGET_SDK_VERSION: 35
```

Update `TARGET_SDK_VERSION` when Google Play requires a newer target SDK.
