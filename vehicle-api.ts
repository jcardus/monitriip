import { fetch } from "expo/fetch";
import { fetchAuthSession } from "aws-amplify/auth";

const DRIVER_API_URL = process.env.EXPO_PUBLIC_DRIVER_API_URL ?? "https://fieldmap.net/driver";
const MONITRIIP_TRIP_URL =
  process.env.EXPO_PUBLIC_MONITRIIP_TRIP_URL ??
  "https://api.pinme.io/pinmeapi/integration/moniitrip/startTrip";

export type Vehicle = {
  id: number;
  name: string;
  uniqueId?: string;
  status?: string;
  lastUpdate?: string;
  positionId?: number;
  attributes?: {
    license_plate?: string;
    clientId?: number;
    bluetooth?: string;
    integration?: string;
    monitrip?: boolean;
    notes?: string;
    [key: string]: unknown;
  };
  position?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    attributes?: {
      ignition?: boolean;
      [key: string]: unknown;
    };
  };
};

async function getAccessToken() {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken.toString();

  if (!accessToken) {
    throw new Error("A sessão expirou. Entre novamente.");
  }

  return accessToken;
}

export async function getVehicles(signal?: AbortSignal) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${DRIVER_API_URL}/devices`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    },
    signal
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("A sessão expirou. Entre novamente.");
    }

    throw new Error(`Não foi possível carregar os veículos (${response.status}).`);
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("O serviço devolveu uma resposta inválida.");
  }

  return (data as Vehicle[]).sort((a, b) => a.name.trim().localeCompare(b.name.trim(), "pt"));
}

export async function toggleVehicleTrip(vehicle: Vehicle, tripLicense: string) {
  const accessToken = await getAccessToken();
  const sessionResponse = await fetch(`${DRIVER_API_URL}/session`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    },
    credentials: "include"
  });

  if (!sessionResponse.ok) {
    throw new Error(
      sessionResponse.status === 401
        ? "A sessão expirou. Entre novamente."
        : `Não foi possível preparar a viagem (${sessionResponse.status}).`
    );
  }

  const sessionCookie = (await sessionResponse.json()) as string;
  const updatedVehicle: Vehicle = {
    ...vehicle,
    attributes: {
      ...vehicle.attributes,
      monitrip: !Boolean(vehicle.attributes?.monitrip),
      notes: tripLicense.trim()
    }
  };
  const response = await fetch(MONITRIIP_TRIP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      Cookie: sessionCookie
    },
    credentials: "include",
    body: JSON.stringify(updatedVehicle)
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("A sessão expirou. Entre novamente.");
    }

    const details = await response.text().catch(() => "");
    throw new Error(details || `Não foi possível atualizar a viagem (${response.status}).`);
  }

  const result = await response.json().catch(() => null) as { mensagem?: string } | null;
  return { updatedVehicle, message: result?.mensagem };
}
