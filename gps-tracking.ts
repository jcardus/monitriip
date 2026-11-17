import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Alert, Linking } from "react-native";
import { clientHeaders } from "./client-headers";
import type { Vehicle } from "./vehicle-api";

const LOCATION_TASK = "monitriip-background-location";
const TRIP_KEY = "monitriip.activeTrip";
const GPS_QUEUE_KEY = "monitriip.gpsQueue";
const DEFAULT_OSMAND_ENDPOINT = "https://osmand.joaquim.workers.dev";

type TrackingTrip = {
  id: string;
  vehicleId: number;
  vehicleName: string;
  vehiclePlate: string;
  uniqueId: string;
  tripLicense: string;
  cpfMotorista?: string;
  startedAt: string;
  endedAt?: string;
  status: "active" | "finished";
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

type LocationTaskData = {
  locations: Location.LocationObject[];
};

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }

  const trip = await readJson<TrackingTrip | null>(TRIP_KEY, null);
  if (!trip || trip.status !== "active") {
    return;
  }

  const { locations } = data as LocationTaskData;
  const samples = locations.map((location) => locationToGpsSample(trip, location));

  await appendGpsSamples(samples);
  await flushGpsQueue();
});

function createTripId(vehicle: Vehicle) {
  return `trip-${vehicle.id}-${Date.now()}`;
}

function getVehicleUniqueId(vehicle: Vehicle) {
  return vehicle.uniqueId == null ? "" : String(vehicle.uniqueId).trim();
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

function locationToGpsSample(trip: TrackingTrip, location: Location.LocationObject): GpsSample {
  return {
    id: `${trip.id}-${location.timestamp}`,
    tripId: trip.id,
    uniqueId: trip.uniqueId,
    deviceLabel: trip.vehicleName,
    source: "phone-location",
    capturedAt: new Date(location.timestamp).toISOString(),
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    heading: location.coords.heading,
    altitude: location.coords.altitude
  };
}

export function buildTraccarUrl(sample: GpsSample) {
  const url = new URL(`${DEFAULT_OSMAND_ENDPOINT}/`);
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

export async function flushGpsQueue() {
  const pending = await readJson<GpsSample[]>(GPS_QUEUE_KEY, []);
  if (pending.length === 0) {
    return { sent: 0, pending };
  }

  let sentCount = 0;
  for (const sample of pending) {
    const response = await fetch(buildTraccarUrl(sample), { method: "GET", headers: clientHeaders() });

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

export async function requestTripLocationPermissions() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    throw new Error("Permissão de localização em primeiro plano negada.");
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    Alert.alert(
      "Localização em segundo plano obrigatória",
      "Ative Sempre/Permitir o tempo todo para enviar o GPS durante a viagem.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Abrir ajustes", onPress: () => Linking.openSettings() }
      ]
    );
    throw new Error("Permissão de localização em segundo plano negada.");
  }
}

// Sends one phone fix straight to Traccar (via the OsmAnd worker) before the
// trip is started, so the backend's startTrip finds a position for the vehicle
// instead of falling back to 0,0. Throws if no fix or the send fails.
export async function sendTripStartPosition(vehicle: Vehicle, tripId: string) {
  const uniqueId = getVehicleUniqueId(vehicle);
  if (!uniqueId) {
    throw new Error("Este veículo não possui uniqueId para envio ao Traccar.");
  }

  let location: Location.LocationObject;
  try {
    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  } catch (error) {
    throw new Error("Não foi possível obter a localização do telefone. Verifique o GPS e tente novamente.");
  }

  const sample = locationToGpsSample(
    {
      id: tripId,
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehiclePlate: vehicle.attributes?.license_plate || "",
      uniqueId,
      tripLicense: "",
      startedAt: new Date().toISOString(),
      status: "active"
    },
    location
  );

  const response = await fetch(buildTraccarUrl(sample), { method: "GET", headers: clientHeaders() });
  if (!response.ok) {
    throw new Error(`Envio da posição inicial falhou com ${response.status}. Tente novamente.`);
  }
}

export function createTripStartId(vehicle: Vehicle) {
  return createTripId(vehicle);
}

export async function getActiveTrip() {
  const trip = await readJson<TrackingTrip | null>(TRIP_KEY, null);
  return trip && trip.status === "active" ? trip : null;
}

export async function startVehicleLocationTracking(
  vehicle: Vehicle,
  tripLicense: string,
  cpfMotorista?: string,
  tripId?: string
) {
  const uniqueId = getVehicleUniqueId(vehicle);
  if (!uniqueId) {
    throw new Error("Este veículo não possui uniqueId para envio ao Traccar.");
  }

  const trip: TrackingTrip = {
    id: tripId || createTripId(vehicle),
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    vehiclePlate: vehicle.attributes?.license_plate || "",
    uniqueId,
    tripLicense: tripLicense.trim(),
    cpfMotorista: cpfMotorista || undefined,
    startedAt: new Date().toISOString(),
    status: "active"
  };

  await AsyncStorage.setItem(TRIP_KEY, JSON.stringify(trip));

  try {
    const currentPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });
    await appendGpsSamples([locationToGpsSample(trip, currentPosition)]);
    await flushGpsQueue();
  } catch (error) {
    // Keep the trip active; the queued point or next background update can be sent later.
  }

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
      notificationBody: "Enviando localização do telefone para o Traccar.",
      notificationColor: "#0f766e"
    }
  });
}

export async function stopVehicleLocationTracking() {
  const trip = await readJson<TrackingTrip | null>(TRIP_KEY, null);
  if (trip) {
    await AsyncStorage.setItem(
      TRIP_KEY,
      JSON.stringify({
        ...trip,
        endedAt: new Date().toISOString(),
        status: "finished"
      })
    );
  }

  const registered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  if (registered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }

  await flushGpsQueue();
}
