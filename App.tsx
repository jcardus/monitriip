import AsyncStorage from "@react-native-async-storage/async-storage";
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
const DEVICE_KEY = "monitriip.selectedDevice";
const DEFAULT_TRACCAR_ENDPOINT = "http://gps.fleetmap.pt:5055";

type ScreenshotScenario = "active" | "evidence";

type TripStatus = "draft" | "active" | "finished";

type Trip = {
  id: string;
  driverName: string;
  driverCpf: string;
  vehiclePlate: string;
  serviceOrder: string;
  routeCode: string;
  trackingDeviceId: string;
  origin: string;
  destination: string;
  startedAt?: string;
  endedAt?: string;
  status: TripStatus;
};

type GpsSample = {
  id: string;
  tripId: string;
  uniqueId: string;
  deviceLabel: string;
  source: "phone-location";
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
};

type TrackingDevice = {
  id: string;
  label: string;
  uniqueId: string;
  vehiclePlate: string;
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
  trackingDeviceId: "",
  origin: "",
  destination: "",
  status: "draft"
};

const trackingDevices: TrackingDevice[] = [
  {
    id: "mxt-001",
    label: "Rastreador MXT-001",
    uniqueId: "864507061234001",
    vehiclePlate: "BUS7A21"
  },
  {
    id: "mxt-002",
    label: "Rastreador MXT-002",
    uniqueId: "864507061234002",
    vehiclePlate: "BUS8B32"
  },
  {
    id: "mxt-003",
    label: "Rastreador MXT-003",
    uniqueId: "864507061234003",
    vehiclePlate: "BUS9C43"
  }
];

const screenshotTrip: Trip = {
  id: "trip-20260721-rjsp",
  driverName: "CARLOS ALMEIDA",
  driverCpf: "12345678901",
  vehiclePlate: "BUS7A21",
  serviceOrder: "OS-2026-0714",
  routeCode: "RJ-SP-430",
  trackingDeviceId: "mxt-001",
  origin: "RIO DE JANEIRO",
  destination: "SAO PAULO",
  startedAt: "2026-07-21T08:35:00.000Z",
  status: "active"
};

const screenshotEvents: EventRecord[] = [
  {
    id: "boarding-demo",
    tripId: screenshotTrip.id,
    type: "boarding",
    createdAt: "2026-07-21T09:18:00.000Z",
    title: "Assento 18",
    detail: "Documento do passageiro MG1234567"
  },
  {
    id: "occurrence-demo",
    tripId: screenshotTrip.id,
    type: "occurrence",
    createdAt: "2026-07-21T11:42:00.000Z",
    title: "Ocorrência operacional",
    detail: "Fiscalização concluída no posto BR-116 KM 184."
  }
];

const screenshotGpsQueue = Array.from({ length: 248 }, (_, index) => ({
  id: `gps-demo-${index}`,
  tripId: screenshotTrip.id,
  uniqueId: "864507061234001",
  deviceLabel: "Rastreador MXT-001",
  source: "phone-location" as const,
  capturedAt: new Date(Date.UTC(2026, 6, 21, 8, 35, index * 15)).toISOString(),
  latitude: -22.9068 + index * 0.001,
  longitude: -43.1729 + index * 0.001,
  accuracy: 8,
  speed: 22,
  heading: 245,
  altitude: 12
}));

function getScreenshotScenario(): ScreenshotScenario | null {
  const maybeLocation = globalThis as unknown as { location?: { search?: string } };
  const search = maybeLocation.location?.search;

  if (!search) {
    return null;
  }

  const scenario = new URLSearchParams(search).get("screenshot");
  return scenario === "active" || scenario === "evidence" ? scenario : null;
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }

  const tripRaw = await AsyncStorage.getItem(TRIP_KEY);
  const trip = tripRaw ? (JSON.parse(tripRaw) as Trip) : null;

  if (!trip || trip.status !== "active") {
    return;
  }

  const deviceRaw = await AsyncStorage.getItem(DEVICE_KEY);
  const selectedDevice = deviceRaw
    ? (JSON.parse(deviceRaw) as TrackingDevice)
    : trackingDevices.find((device) => device.id === trip.trackingDeviceId) || trackingDevices[0];

  const { locations } = data as LocationTaskData;
  const samples = locations.map<GpsSample>((location) => locationToGpsSample(trip, selectedDevice, location, "phone-location"));

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

function locationToGpsSample(trip: Trip, device: TrackingDevice, location: Location.LocationObject, source: GpsSample["source"]): GpsSample {
  return {
    id: `${trip.id}-${location.timestamp}`,
    tripId: trip.id,
    uniqueId: device.uniqueId,
    deviceLabel: device.label,
    source,
    capturedAt: new Date(location.timestamp).toISOString(),
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    heading: location.coords.heading,
    altitude: location.coords.altitude
  };
}

async function getGpsEndpoint() {
  return DEFAULT_TRACCAR_ENDPOINT;
}

function buildTraccarUrl(endpoint: string, sample: GpsSample) {
  const url = new URL(endpoint.endsWith("/") ? endpoint : `${endpoint}/`);
  url.searchParams.set("id", sample.uniqueId);
  url.searchParams.set("lat", String(sample.latitude));
  url.searchParams.set("lon", String(sample.longitude));
  url.searchParams.set("timestamp", sample.capturedAt);
  url.searchParams.set("valid", "true");

  if (sample.speed != null) {
    url.searchParams.set("speed", String(sample.speed * 1.943844));
  }

  if (sample.heading != null) {
    url.searchParams.set("bearing", String(sample.heading));
  }

  if (sample.altitude != null) {
    url.searchParams.set("altitude", String(sample.altitude));
  }

  if (sample.accuracy != null) {
    url.searchParams.set("accuracy", String(sample.accuracy));
  }

  url.searchParams.set("tripId", sample.tripId);
  url.searchParams.set("deviceLabel", sample.deviceLabel);
  url.searchParams.set("source", sample.source);
  return url.toString();
}

async function flushGpsQueue() {
  const endpoint = await getGpsEndpoint();

  if (!endpoint) {
    return { sent: 0, pending: await readJson<GpsSample[]>(GPS_QUEUE_KEY, []) };
  }

  const pending = await readJson<GpsSample[]>(GPS_QUEUE_KEY, []);
  if (pending.length === 0) {
    return { sent: 0, pending };
  }

  let sentCount = 0;

  for (const sample of pending) {
    const response = await fetch(buildTraccarUrl(endpoint, sample), {
      method: "GET"
    });

    if (!response.ok) {
      const remaining = pending.slice(sentCount);
      await AsyncStorage.setItem(GPS_QUEUE_KEY, JSON.stringify(remaining));
      throw new Error(`Envio Traccar falhou com ${response.status}`);
    }

    sentCount += 1;
  }

  await AsyncStorage.setItem(GPS_QUEUE_KEY, JSON.stringify([]));
  return { sent: sentCount, pending: [] };
}

export default function App() {
  const screenshotScenario = getScreenshotScenario();
  const [trip, setTrip] = useState<Trip>(
    screenshotScenario
      ? screenshotTrip
      : {
          ...emptyTrip,
          vehiclePlate: trackingDevices[0].vehiclePlate,
          trackingDeviceId: trackingDevices[0].id
        }
  );
  const [selectedDevice, setSelectedDevice] = useState<TrackingDevice>(trackingDevices[0]);
  const [events, setEvents] = useState<EventRecord[]>(screenshotScenario ? screenshotEvents : []);
  const [gpsQueue, setGpsQueue] = useState<GpsSample[]>(screenshotScenario === "active" ? screenshotGpsQueue : []);
  const [permissionStatus, setPermissionStatus] = useState(screenshotScenario ? "autorizada em primeiro e segundo plano" : "Não verificada");
  const [passengerDoc, setPassengerDoc] = useState(screenshotScenario === "evidence" ? "MG1234567" : "");
  const [seat, setSeat] = useState(screenshotScenario === "evidence" ? "18" : "");
  const [occurrence, setOccurrence] = useState(
    screenshotScenario === "evidence" ? "Fiscalização rodoviária concluída no posto BR-116 KM 184. Viagem seguiu sem atraso." : ""
  );
  const [lastSync, setLastSync] = useState(screenshotScenario === "evidence" ? "16:22 - enviados 248" : "Nunca");

  const active = trip.status === "active";

  const routeLabel = useMemo(() => {
    if (!trip.origin && !trip.destination) {
      return "Rota não definida";
    }

    return `${trip.origin || "Origem"} para ${trip.destination || "Destino"}`;
  }, [trip.destination, trip.origin]);

  const refreshQueues = useCallback(async () => {
    setEvents(await readJson<EventRecord[]>(EVENT_QUEUE_KEY, []));
    setGpsQueue(await readJson<GpsSample[]>(GPS_QUEUE_KEY, []));
  }, []);

  useEffect(() => {
    async function boot() {
      if (screenshotScenario) {
        return;
      }

      const storedTrip = await readJson<Trip | null>(TRIP_KEY, null);
      if (storedTrip) {
        setTrip(storedTrip);
      }

      const storedDevice = await readJson<TrackingDevice | null>(DEVICE_KEY, null);
      if (storedDevice) {
        const migratedDevice = storedDevice.uniqueId ? storedDevice : trackingDevices.find((device) => device.id === storedDevice.id) || trackingDevices[0];
        setSelectedDevice(migratedDevice);
        await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(migratedDevice));
      }

      await refreshQueues();
      const foreground = await Location.getForegroundPermissionsAsync();
      const background = await Location.getBackgroundPermissionsAsync();
      setPermissionStatus(`${foreground.status} primeiro plano, ${background.status} segundo plano`);
    }

    boot();
  }, [refreshQueues, screenshotScenario]);

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

  async function selectDevice(device: TrackingDevice) {
    setSelectedDevice(device);
    await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(device));
    await persistTrip({
      ...trip,
      id: trip.id || createId("trip"),
      vehiclePlate: device.vehiclePlate,
      trackingDeviceId: device.id
    });
  }

  async function requestLocationPermissions() {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== "granted") {
      setPermissionStatus("Foreground location denied");
      return false;
    }

    const background = await Location.requestBackgroundPermissionsAsync();
      setPermissionStatus(`${foreground.status} primeiro plano, ${background.status} segundo plano`);

    if (background.status !== "granted") {
      Alert.alert(
        "Localização em segundo plano obrigatória",
        "Ative Sempre/Permitir o tempo todo para manter as evidências de GPS durante a viagem.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Abrir ajustes", onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }

    return true;
  }

  async function startTrip() {
    if (!trip.driverCpf || !trip.serviceOrder || !trip.origin || !trip.destination || !selectedDevice?.uniqueId) {
      Alert.alert("Preparação incompleta", "CPF do motorista, placa, ordem de serviço, origem, destino e rastreador são obrigatórios.");
      return;
    }

    const allowed = await requestLocationPermissions();
    if (!allowed) {
      return;
    }

    const nextTrip: Trip = {
      ...trip,
      id: trip.id || createId("trip"),
      trackingDeviceId: selectedDevice.id,
      vehiclePlate: selectedDevice.vehiclePlate,
      startedAt: new Date().toISOString(),
      endedAt: undefined,
      status: "active"
    };

    await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(selectedDevice));
    await persistTrip(nextTrip);

    const currentPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });
    await appendGpsSamples([locationToGpsSample(nextTrip, selectedDevice, currentPosition, "phone-location")]);
    await flushGpsQueue();
    await refreshQueues();

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 15000,
      distanceInterval: 50,
      deferredUpdatesDistance: 250,
      deferredUpdatesInterval: 60000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Viagem Monitriip ativa",
        notificationBody: "Coletando evidências de GPS para a viagem em andamento.",
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
      Alert.alert("Embarque não registrado", "Inicie a viagem e informe documento do passageiro e assento.");
      return;
    }

    await appendEvent({
      id: createId("boarding"),
      tripId: trip.id,
      type: "boarding",
      createdAt: new Date().toISOString(),
      title: `Assento ${seat.toUpperCase()}`,
      detail: `Documento do passageiro ${passengerDoc.toUpperCase()}`
    });
    setPassengerDoc("");
    setSeat("");
    await refreshQueues();
  }

  async function recordOccurrence() {
    if (!active || !occurrence) {
      Alert.alert("Ocorrência não registrada", "Inicie a viagem e descreva a ocorrência.");
      return;
    }

    await appendEvent({
      id: createId("occurrence"),
      tripId: trip.id,
      type: "occurrence",
      createdAt: new Date().toISOString(),
      title: "Ocorrência operacional",
      detail: occurrence
    });
    setOccurrence("");
    await refreshQueues();
  }

  async function syncNow() {
    try {
      const result = await flushGpsQueue();
      await refreshQueues();
      setLastSync(`${new Date().toLocaleTimeString()} - enviados ${result.sent}`);
    } catch (error) {
      setLastSync(`${new Date().toLocaleTimeString()} - falha ao sincronizar`);
      Alert.alert("Falha na sincronização", error instanceof Error ? error.message : "A fila de GPS continua salva no aparelho.");
    }
  }

  const exportPayload = JSON.stringify(
    {
      trip,
      gpsPendente: gpsQueue,
      eventos: events
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
            <Text style={styles.eyebrow}>Operação ANTT Monitriip</Text>
            <Text style={styles.title}>Console do Motorista</Text>
          </View>
          <View style={[styles.statusPill, active ? styles.statusActive : styles.statusIdle]}>
            <Text style={styles.statusText}>{active ? "Rastreando" : trip.status === "finished" ? "Finalizada" : "Rascunho"}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Preparação da viagem</Text>
          <Field label="Nome do motorista" value={trip.driverName} onChangeText={(value) => updateTrip("driverName", value)} />
          <Field label="CPF do motorista" value={trip.driverCpf} onChangeText={(value) => updateTrip("driverCpf", value)} keyboardType="number-pad" />
          <Field label="Placa do veículo" value={trip.vehiclePlate} onChangeText={(value) => updateTrip("vehiclePlate", value)} />
          <Field label="Ordem de serviço" value={trip.serviceOrder} onChangeText={(value) => updateTrip("serviceOrder", value)} />
          <Field label="Código da linha" value={trip.routeCode} onChangeText={(value) => updateTrip("routeCode", value)} />
          <View style={styles.deviceList}>
            <Text style={styles.label}>RASTREADOR</Text>
            {trackingDevices.map((device) => (
              <Pressable
                key={device.id}
                accessibilityRole="button"
                onPress={() => selectDevice(device)}
                style={[styles.deviceOption, selectedDevice.id === device.id ? styles.deviceOptionSelected : null]}
              >
                <View>
                  <Text style={styles.deviceName}>{device.label}</Text>
                  <Text style={styles.deviceMeta}>Unique ID {device.uniqueId} · Placa {device.vehiclePlate}</Text>
                </View>
                <Text style={styles.deviceCheck}>{selectedDevice.id === device.id ? "Selecionado" : "Usar"}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field label="Origem" value={trip.origin} onChangeText={(value) => updateTrip("origin", value)} />
            </View>
            <View style={styles.flex}>
              <Field label="Destino" value={trip.destination} onChangeText={(value) => updateTrip("destination", value)} />
            </View>
          </View>
        </View>

        <View style={styles.summaryBand}>
          <Text style={styles.route}>{routeLabel}</Text>
          <Text style={styles.meta}>Permissões: {permissionStatus}</Text>
          <Text style={styles.meta}>GPS na fila: {gpsQueue.length} pontos</Text>
          <Text style={styles.meta}>Última sincronização: {lastSync}</Text>
          <View style={styles.actions}>
            <ActionButton label="Iniciar viagem" onPress={startTrip} disabled={active} variant="primary" />
            <ActionButton label="Encerrar viagem" onPress={endTrip} disabled={!active} variant="danger" />
            <ActionButton label="Sincronizar" onPress={syncNow} />
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Embarcar passageiro</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field label="Documento" value={passengerDoc} onChangeText={setPassengerDoc} />
            </View>
            <View style={styles.seatField}>
              <Field label="Assento" value={seat} onChangeText={setSeat} />
            </View>
          </View>
          <ActionButton label="Registrar embarque" onPress={recordBoarding} disabled={!active} variant="primary" />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Ocorrência</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={occurrence}
            onChangeText={setOccurrence}
            multiline
            placeholder="Atraso, fiscalização, desvio de rota, atendimento a passageiro..."
            placeholderTextColor="#64748b"
          />
          <ActionButton label="Registrar ocorrência" onPress={recordOccurrence} disabled={!active} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Evidências da viagem</Text>
          {events.slice(0, 6).map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDetail}>{event.detail}</Text>
              <Text style={styles.eventTime}>{new Date(event.createdAt).toLocaleString()}</Text>
            </View>
          ))}
          {events.length === 0 ? <Text style={styles.empty}>Nenhum embarque ou ocorrência registrado ainda.</Text> : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Pacote de exportação</Text>
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
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

function Field({ label, value, onChangeText, keyboardType = "default", autoCapitalize = "characters" }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
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
  deviceList: {
    gap: 8
  },
  deviceOption: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  deviceOptionSelected: {
    borderColor: "#0f766e",
    backgroundColor: "#ecfdf5"
  },
  deviceName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800"
  },
  deviceMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2
  },
  deviceCheck: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
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
