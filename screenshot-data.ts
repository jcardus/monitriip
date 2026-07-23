import type { Vehicle } from "./vehicle-api";

export const screenshotEmail = "carlos.almeida@viaexpressa.com";

export const screenshotVehicles: Vehicle[] = [
  {
    id: 101,
    name: "Expresso RJ-SP 430",
    uniqueId: "864507061234001",
    status: "online",
    lastUpdate: new Date().toISOString(),
    attributes: {
      license_plate: "BUS7A21",
      monitrip: true,
      notes: "OS-2026-0714"
    },
    position: {
      attributes: {
        ignition: true
      }
    }
  },
  {
    id: 102,
    name: "Linha 116 Norte",
    uniqueId: "864507061234002",
    status: "online",
    lastUpdate: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    attributes: {
      license_plate: "BUS8B32",
      monitrip: false
    },
    position: {
      attributes: {
        ignition: false
      }
    }
  },
  {
    id: 103,
    name: "Executivo Campinas",
    uniqueId: "864507061234003",
    status: "offline",
    lastUpdate: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    attributes: {
      license_plate: "BUS9C43",
      monitrip: false
    },
    position: {
      attributes: {
        ignition: false
      }
    }
  }
];

export function isScreenshotMode() {
  const maybeLocation = globalThis as unknown as { location?: { search?: string } };
  return new URLSearchParams(maybeLocation.location?.search || "").has("screenshot");
}
