export function buildClientHeaders(info: {
  name?: string | null;
  version?: string | null;
  platform?: string | null;
  build?: string | null;
  updateId?: string | null;
}) {
  const headers: Record<string, string> = {
    "X-App-Name": info.name || "monitriip-driver",
    "X-App-Version": info.version || "unknown",
    "X-App-Platform": info.platform || "unknown",
    "X-App-Update-Id": info.updateId || "embedded"
  };
  if (info.build) headers["X-App-Build"] = info.build;
  return headers;
}

function nativeBuild(platform: string | undefined, constants: {
  platform?: {
    ios?: { buildNumber?: string | null };
    android?: { versionCode?: number | null };
  };
}) {
  if (platform === "ios") return constants.platform?.ios?.buildNumber ?? null;
  if (platform === "android") return constants.platform?.android?.versionCode?.toString() ?? null;
  return null;
}

export function clientHeaders() {
  const constants = require("expo-constants").default as {
    expoConfig?: { slug?: string | null; version?: string | null };
    platform?: {
      ios?: { buildNumber?: string | null };
      android?: { versionCode?: number | null };
    };
  };
  const updates = require("expo-updates") as { updateId?: string | null };
  const platform = process.env.EXPO_OS;

  return buildClientHeaders({
    name: constants.expoConfig?.slug,
    version: constants.expoConfig?.version,
    platform,
    build: nativeBuild(platform, constants),
    updateId: updates.updateId
  });
}
