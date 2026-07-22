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
