import Constants from "expo-constants";
import { Alert, Linking, Platform } from "react-native";

const IOS_STORE_URL = "https://apps.apple.com/br/app/monitriip-driver/id6792935618";
const ANDROID_STORE_URL = "https://play.google.com/store/apps/details?id=com.monitriip.driver";

function parseVersion(value: string | null | undefined) {
  return String(value || "0")
    .split(".")
    .map((part) => Number.parseInt(part.replace(/\D/g, ""), 10) || 0);
}

export function isVersionOlder(current: string | null | undefined, latest: string | null | undefined) {
  const left = parseVersion(current);
  const right = parseVersion(latest);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const a = left[i] || 0;
    const b = right[i] || 0;
    if (a < b) return true;
    if (a > b) return false;
  }
  return false;
}

function storeUrl() {
  return Platform.OS === "ios" ? IOS_STORE_URL : ANDROID_STORE_URL;
}

export async function promptStoreUpdateIfNeeded() {
  const currentVersion = Constants.expoConfig?.version ?? null;
  const latestStoreVersion =
    (Constants.expoConfig?.extra as { latestStoreVersion?: string } | undefined)?.latestStoreVersion ??
    null;

  if (!currentVersion || !latestStoreVersion) return;
  if (!isVersionOlder(currentVersion, latestStoreVersion)) return;

  Alert.alert(
    "Nova versão disponível",
    `Há uma nova versão do Monitriip Driver na loja (${latestStoreVersion}). Atualize para continuar recebendo melhorias automaticamente.`,
    [
      { text: "Depois", style: "cancel" },
      {
        text: "Atualizar",
        onPress: () => {
          Linking.openURL(storeUrl()).catch(() => {
            Alert.alert("Não foi possível abrir a loja", `Abra o link do app: ${storeUrl()}`);
          });
        }
      }
    ]
  );
}
