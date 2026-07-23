# Monitriip Driver

Native mobile app scaffold for Brazilian bus drivers operating trips that need ANTT Monitriip-style operational evidence.

This is intentionally native, not a PWA, because the app records GPS while a trip is active and the phone is in the background. The current implementation uses Expo/React Native with `expo-location` and `expo-task-manager`.

## What is included

- Driver, vehicle, route, service order, and trip setup.
- Start/end trip workflow with background GPS tracking.
- Local queue for GPS samples while connectivity is unavailable.
- Foreground and background send to the Traccar OsmAnd HTTPS endpoint.
- Passenger boarding and operational occurrence records.
- JSON export for inspection or backend handoff.

## Native location notes

Background GPS requires a development or production native build. It will not work completely in Expo Go, especially on iOS.

The app config enables:

- iOS `UIBackgroundModes: ["location"]`
- Android background location and foreground service permissions
- Expo Location config plugin for native permission strings

GPS positions are sent to the hardcoded Traccar OsmAnd endpoint:

```text
https://osmand.joaquim.workers.dev
```

The request uses the selected tracker's `uniqueId` as Traccar's `id` query parameter:

```text
/?id=<uniqueId>&lat=<latitude>&lon=<longitude>&timestamp=<iso-time>&speed=<knots>&bearing=<degrees>&altitude=<meters>&accuracy=<meters>
```

## Run

```sh
npm install
npm run ios
```

or:

```sh
npm run android
```

Use a real device for background GPS validation. Simulators are useful for UI checks, but they do not represent field behavior reliably.

## Over-the-air updates

The app is configured for EAS Update with the `appVersion` runtime policy. Production builds listen on the `production` update channel, and internal preview builds listen on the `preview` channel.

Pushing to `main` triggers `.eas/workflows/update-production.yml`, which publishes a production OTA update for JavaScript and asset changes.

Publish JavaScript and asset-only changes without a new store build:

```sh
npm run update:production -- --message "Describe the update"
```

Use a new iOS/Android build whenever native code, permissions, plugins, Expo SDK, or native dependencies change.

## Store upload automation

Run `.eas/workflows/build-and-submit.yml` manually when native changes require new iOS and Android binaries. The workflow queues EAS production builds for iOS and Android, then submits successful builds to App Store Connect/TestFlight and Google Play.

iOS submission uses the App Store Connect app id configured in `eas.json`. Apple credentials/API key must already be configured in EAS for non-interactive submissions.

Android submission uses the Google Play service account key already configured in EAS Android Service Credentials.
