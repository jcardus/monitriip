import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

const LOCATION_TASK = "monitriip-background-location";
const TRIP_KEY = "monitriip.activeTrip";
const GPS_QUEUE_KEY = "monitriip.gpsQueue";
const EVENT_QUEUE_KEY = "monitriip.eventQueue";

type TripStatus = "draft" | "active" | "finished";

type Trip = {
  id: string;
  driverName: string;
  driverCpf: string;
  vehiclePlate: string;
  serviceOrder: string;
  routeCode: string;
  origin: string;
  destination: string;
  startedAt?: string;
  endedAt?: string;
  status: TripStatus;
};

type GpsSample = {
  id: string;
  tripId: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
};

type EventRecord = {
  id: string;
  tripId: string;
  type: "boarding" | "occurrence";
  createdAt: string;
  title: string;
  detail: string;
};

type LocationTaskData = {
  locations: Location.LocationObject[];
};

const emptyTrip: Trip = {
  id: "",
  driverName: "",
  driverCpf: "",
  vehiclePlate: "",
  serviceOrder: "",
  routeCode: "",
  origin: "",
  destination: "",
  status: "draft"
};

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }

  const tripRaw = await AsyncStorage.getItem(TRIP_KEY);
  const trip = tripRaw ? (JSON.parse(tripRaw) as Trip) : null;

  if (!trip || trip.status !== "active") {
    return;
  }

  const { locations } = data as LocationTaskData;
  const samples = locations.map<GpsSample>((location) => ({
    id: `${trip.id}-${location.timestamp}`,
    tripId: trip.id,
    capturedAt: new Date(location.timestamp).toISOString(),
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    heading: location.coords.heading,
    altitude: location.coords.altitude
  }));

  await appendGpsSamples(samples);
  await flushGpsQueue();
});

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

async function appendGpsSamples(samples: GpsSample[]) {
  if (samples.length === 0) {
    return;
  }

  const queue = await readJson<GpsSample[]>(GPS_QUEUE_KEY, []);
  await AsyncStorage.setItem(GPS_QUEUE_KEY, JSON.stringify([...queue, ...samples]));
}

async function appendEvent(event: EventRecord) {
  const queue = await readJson<EventRecord[]>(EVENT_QUEUE_KEY, []);
  await AsyncStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify([event, ...queue]));
}

function getGpsEndpoint() {
  return (
    process.env.EXPO_PUBLIC_MONITRIIP_GPS_ENDPOINT ||
    (Constants.expoConfig?.extra?.monitriipGpsEndpoint as string | undefined) ||
    ""
  );
}

async function flushGpsQueue() {
  const endpoint = getGpsEndpoint();

  if (!endpoint) {
    return { sent: 0, pending: await readJson<GpsSample[]>(GPS_QUEUE_KEY, []) };
  }

  const pending = await readJson<GpsSample[]>(GPS_QUEUE_KEY, []);
  if (pending.length === 0) {
    return { sent: 0, pending };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      source: "monitriip-driver",
      sentAt: new Date().toISOString(),
      samples: pending
    })
  });

  if (!response.ok) {
    throw new Error(`GPS upload failed with ${response.status}`);
  }

  await AsyncStorage.setItem(GPS_QUEUE_KEY, JSON.stringify([]));
  return { sent: pending.length, pending: [] };
}

export default function App() {
  const [trip, setTrip] = useState<Trip>(emptyTrip);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [gpsQueue, setGpsQueue] = useState<GpsSample[]>([]);
  const [permissionStatus, setPermissionStatus] = useState("Not checked");
  const [passengerDoc, setPassengerDoc] = useState("");
  const [seat, setSeat] = useState("");
  const [occurrence, setOccurrence] = useState("");
  const [lastSync, setLastSync] = useState("Never");

  const active = trip.status === "active";

  const routeLabel = useMemo(() => {
    if (!trip.origin && !trip.destination) {
      return "No route set";
    }

    return `${trip.origin || "Origin"} to ${trip.destination || "Destination"}`;
  }, [trip.destination, trip.origin]);

  const refreshQueues = useCallback(async () => {
    setEvents(await readJson<EventRecord[]>(EVENT_QUEUE_KEY, []));
    setGpsQueue(await readJson<GpsSample[]>(GPS_QUEUE_KEY, []));
  }, []);

  useEffect(() => {
    async function boot() {
      const storedTrip = await readJson<Trip | null>(TRIP_KEY, null);
      if (storedTrip) {
        setTrip(storedTrip);
      }

      await refreshQueues();
      const foreground = await Location.getForegroundPermissionsAsync();
      const background = await Location.getBackgroundPermissionsAsync();
      setPermissionStatus(`${foreground.status} foreground, ${background.status} background`);
    }

    boot();
  }, [refreshQueues]);

  async function persistTrip(nextTrip: Trip) {
    setTrip(nextTrip);
    await AsyncStorage.setItem(TRIP_KEY, JSON.stringify(nextTrip));
  }

  function updateTrip(field: keyof Trip, value: string) {
    const nextTrip = {
      ...trip,
      id: trip.id || createId("trip"),
      [field]: value.toUpperCase()
    };
    persistTrip(nextTrip);
  }

  async function requestLocationPermissions() {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== "granted") {
      setPermissionStatus("Foreground location denied");
      return false;
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    setPermissionStatus(`${foreground.status} foreground, ${background.status} background`);

    if (background.status !== "granted") {
      Alert.alert(
        "Background location required",
        "Enable Always Allow/Allow all the time so GPS evidence can continue during an active trip.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open settings", onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }

    return true;
  }

  async function startTrip() {
    if (!trip.driverCpf || !trip.vehiclePlate || !trip.serviceOrder || !trip.origin || !trip.destination) {
      Alert.alert("Trip setup incomplete", "Driver CPF, plate, service order, origin, and destination are required.");
      return;
    }

    const allowed = await requestLocationPermissions();
    if (!allowed) {
      return;
    }

    const nextTrip: Trip = {
      ...trip,
      id: trip.id || createId("trip"),
      startedAt: new Date().toISOString(),
      endedAt: undefined,
      status: "active"
    };

    await persistTrip(nextTrip);
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 15000,
      distanceInterval: 50,
      deferredUpdatesDistance: 250,
      deferredUpdatesInterval: 60000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Monitriip trip active",
        notificationBody: "Collecting GPS evidence for the active bus trip.",
        notificationColor: "#0f766e"
      }
    });
  }

  async function endTrip() {
    const nextTrip: Trip = {
      ...trip,
      endedAt: new Date().toISOString(),
      status: "finished"
    };

    await persistTrip(nextTrip);

    const registered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
    if (registered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }

    await refreshQueues();
  }

  async function recordBoarding() {
    if (!active || !passengerDoc || !seat) {
      Alert.alert("Boarding not recorded", "Start a trip and enter passenger document plus seat.");
      return;
    }

    await appendEvent({
      id: createId("boarding"),
      tripId: trip.id,
      type: "boarding",
      createdAt: new Date().toISOString(),
      title: `Seat ${seat.toUpperCase()}`,
      detail: `Passenger document ${passengerDoc.toUpperCase()}`
    });
    setPassengerDoc("");
    setSeat("");
    await refreshQueues();
  }

  async function recordOccurrence() {
    if (!active || !occurrence) {
      Alert.alert("Occurrence not recorded", "Start a trip and describe the occurrence.");
      return;
    }

    await appendEvent({
      id: createId("occurrence"),
      tripId: trip.id,
      type: "occurrence",
      createdAt: new Date().toISOString(),
      title: "Operational occurrence",
      detail: occurrence
    });
    setOccurrence("");
    await refreshQueues();
  }

  async function syncNow() {
    try {
      const result = await flushGpsQueue();
      await refreshQueues();
      setLastSync(`${new Date().toLocaleTimeString()} - sent ${result.sent}`);
    } catch (error) {
      setLastSync(`${new Date().toLocaleTimeString()} - sync failed`);
      Alert.alert("Sync failed", error instanceof Error ? error.message : "GPS queue remains stored on device.");
    }
  }

  const exportPayload = JSON.stringify(
    {
      trip,
      gpsPending: gpsQueue,
      events
    },
    null,
    2
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ANTT Monitriip operations</Text>
            <Text style={styles.title}>Driver Trip Console</Text>
          </View>
          <View style={[styles.statusPill, active ? styles.statusActive : styles.statusIdle]}>
            <Text style={styles.statusText}>{active ? "Tracking" : trip.status}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Trip setup</Text>
          <Field label="Driver name" value={trip.driverName} onChangeText={(value) => updateTrip("driverName", value)} />
          <Field label="Driver CPF" value={trip.driverCpf} onChangeText={(value) => updateTrip("driverCpf", value)} keyboardType="number-pad" />
          <Field label="Vehicle plate" value={trip.vehiclePlate} onChangeText={(value) => updateTrip("vehiclePlate", value)} />
          <Field label="Service order" value={trip.serviceOrder} onChangeText={(value) => updateTrip("serviceOrder", value)} />
          <Field label="Route code" value={trip.routeCode} onChangeText={(value) => updateTrip("routeCode", value)} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field label="Origin" value={trip.origin} onChangeText={(value) => updateTrip("origin", value)} />
            </View>
            <View style={styles.flex}>
              <Field label="Destination" value={trip.destination} onChangeText={(value) => updateTrip("destination", value)} />
            </View>
          </View>
        </View>

        <View style={styles.summaryBand}>
          <Text style={styles.route}>{routeLabel}</Text>
          <Text style={styles.meta}>Permissions: {permissionStatus}</Text>
          <Text style={styles.meta}>GPS queued: {gpsQueue.length} samples</Text>
          <Text style={styles.meta}>Last sync: {lastSync}</Text>
          <View style={styles.actions}>
            <ActionButton label="Start trip" onPress={startTrip} disabled={active} variant="primary" />
            <ActionButton label="End trip" onPress={endTrip} disabled={!active} variant="danger" />
            <ActionButton label="Sync" onPress={syncNow} />
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Board passenger</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field label="Document" value={passengerDoc} onChangeText={setPassengerDoc} />
            </View>
            <View style={styles.seatField}>
              <Field label="Seat" value={seat} onChangeText={setSeat} />
            </View>
          </View>
          <ActionButton label="Record boarding" onPress={recordBoarding} disabled={!active} variant="primary" />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Occurrence</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={occurrence}
            onChangeText={setOccurrence}
            multiline
            placeholder="Delay, inspection, route deviation, passenger issue..."
            placeholderTextColor="#64748b"
          />
          <ActionButton label="Record occurrence" onPress={recordOccurrence} disabled={!active} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Trip evidence</Text>
          {events.slice(0, 6).map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDetail}>{event.detail}</Text>
              <Text style={styles.eventTime}>{new Date(event.createdAt).toLocaleString()}</Text>
            </View>
          ))}
          {events.length === 0 ? <Text style={styles.empty}>No passenger or occurrence records yet.</Text> : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Export packet</Text>
          <Text selectable style={styles.codeBlock}>
            {exportPayload}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad";
};

function Field({ label, value, onChangeText, keyboardType = "default" }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="characters"
        placeholderTextColor="#64748b"
      />
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
};

function ActionButton({ label, onPress, disabled = false, variant = "default" }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" ? styles.buttonPrimary : null,
        variant === "danger" ? styles.buttonDanger : null,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null
      ]}
    >
      <Text style={[styles.buttonText, variant !== "default" ? styles.buttonTextOnColor : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 14
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingTop: 8
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 2
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  statusActive: {
    backgroundColor: "#dcfce7"
  },
  statusIdle: {
    backgroundColor: "#e2e8f0"
  },
  statusText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10
  },
  panelTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800"
  },
  field: {
    gap: 5
  },
  label: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    fontSize: 16
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: "top"
  },
  row: {
    flexDirection: "row",
    gap: 10
  },
  flex: {
    flex: 1
  },
  seatField: {
    width: 92
  },
  summaryBand: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 16,
    gap: 8
  },
  route: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800"
  },
  meta: {
    color: "#cbd5e1",
    fontSize: 13
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6
  },
  button: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0"
  },
  buttonPrimary: {
    backgroundColor: "#0f766e"
  },
  buttonDanger: {
    backgroundColor: "#b91c1c"
  },
  buttonDisabled: {
    opacity: 0.45
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }]
  },
  buttonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800"
  },
  buttonTextOnColor: {
    color: "#ffffff"
  },
  eventRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    gap: 2
  },
  eventTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800"
  },
  eventDetail: {
    color: "#334155",
    fontSize: 14
  },
  eventTime: {
    color: "#64748b",
    fontSize: 12
  },
  empty: {
    color: "#64748b",
    fontSize: 14
  },
  codeBlock: {
    color: "#334155",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 10,
    fontSize: 11,
    lineHeight: 16
  }
});
