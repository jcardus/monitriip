import { fetch } from "expo/fetch";
import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { cleanCpf, isValidCpf, readLoggedInDriverCpf } from "./cpf";
import { readTripErrorMessage } from "./trip-error";

const DRIVER_API_URL = process.env.EXPO_PUBLIC_DRIVER_API_URL ?? "https://fieldmap.net/driver";
const MONITRIIP_TRIP_URL =
  process.env.EXPO_PUBLIC_MONITRIIP_TRIP_URL ??
  "https://api.pinme.io/pinmeapi/integration/moniitrip/startTrip";
const MONITRIIP_CPF_URL =
  process.env.EXPO_PUBLIC_MONITRIIP_CPF_URL ??
  "https://api.pinme.io/pinmeapi/integration/moniitrip/requiresDriverCpf";

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

export type DriverCpfInfo = {
  requiresDriverCpf: boolean;
  cpfMotorista: string;
  driverName: string | null;
};

async function getSessionCookie(accessToken: string) {
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

  return (await sessionResponse.json()) as string;
}

async function readSignedInDriverCpf() {
  const [session, attributes, currentUser] = await Promise.all([
    fetchAuthSession(),
    fetchUserAttributes().catch(() => ({})),
    getCurrentUser().catch(() => null)
  ]);
  return (
    readLoggedInDriverCpf(attributes) ||
    readLoggedInDriverCpf(session.tokens?.idToken?.payload) ||
    readLoggedInDriverCpf(session.tokens?.accessToken?.payload) ||
    readLoggedInDriverCpf({
      username: currentUser?.username,
      loginId: currentUser?.signInDetails?.loginId
    })
  );
}

export type DriverProfile = {
  driverName: string | null;
  cpfMotorista: string;
};

async function getLoggedInDriver(accessToken: string): Promise<DriverProfile> {
  const signedInCpf = await readSignedInDriverCpf();
  let data: { name?: string | null } | null = null;

  try {
    const response = await fetch(`${DRIVER_API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });

    if (response.status === 401) {
      throw new Error("A sessão expirou. Entre novamente.");
    }
    if (response.ok) {
      data = (await response.json()) as { name?: string | null };
    }
  } catch (error) {
    if (error instanceof Error && /sessão expirou/i.test(error.message)) throw error;
  }

  return {
    driverName: data?.name || null,
    cpfMotorista: readLoggedInDriverCpf(data) || signedInCpf
  };
}

export async function getDriverProfile(): Promise<DriverProfile> {
  const accessToken = await getAccessToken();
  return getLoggedInDriver(accessToken);
}

export async function getDriverCpfInfo(deviceId: number): Promise<DriverCpfInfo> {
  const accessToken = await getAccessToken();
  const sessionCookie = await getSessionCookie(accessToken);
  const loggedInDriver = await getLoggedInDriver(accessToken);

  try {
    const requiredResponse = await fetch(`${MONITRIIP_CPF_URL}/${deviceId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        Cookie: sessionCookie
      },
      credentials: "include"
    });

    if (requiredResponse.status === 401) {
      throw new Error("A sessão expirou. Entre novamente.");
    }
    if (!requiredResponse.ok) {
      return { requiresDriverCpf: true, ...loggedInDriver };
    }

    const requiredData = (await requiredResponse.json()) as { requiresDriverCpf?: boolean };
    return {
      requiresDriverCpf: Boolean(requiredData.requiresDriverCpf),
      ...loggedInDriver
    };
  } catch (error) {
    if (error instanceof Error && /sessão expirou/i.test(error.message)) throw error;
    return { requiresDriverCpf: true, ...loggedInDriver };
  }
}

export async function toggleVehicleTrip(
  vehicle: Vehicle,
  tripLicense: string,
  cpfMotorista?: string
) {
  const accessToken = await getAccessToken();
  const sessionCookie = await getSessionCookie(accessToken);
  const updatedVehicle: Vehicle = {
    ...vehicle,
    attributes: {
      ...vehicle.attributes,
      monitrip: !Boolean(vehicle.attributes?.monitrip),
      notes: tripLicense.trim()
    }
  };
  let cpf = cleanCpf(cpfMotorista);
  if (!isValidCpf(cpf)) {
    cpf = (await getLoggedInDriver(accessToken)).cpfMotorista;
  }
  const response = await fetch(MONITRIIP_TRIP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      Cookie: sessionCookie
    },
    credentials: "include",
    body: JSON.stringify(isValidCpf(cpf) ? { ...updatedVehicle, cpfMotorista: cpf } : updatedVehicle)
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("A sessão expirou. Entre novamente.");
    }

    const details = await response.text().catch(() => "");
    throw new Error(readTripErrorMessage(details, response.status));
  }

  const result = await response.json().catch(() => null) as { mensagem?: string } | null;
  return {
    updatedVehicle,
    message: result?.mensagem,
    cpfMotorista: isValidCpf(cpf) ? cpf : ""
  };
}
