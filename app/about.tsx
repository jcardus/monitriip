import Constants from "expo-constants";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Updates from "expo-updates";

function getNativeBuildVersion() {
  if (process.env.EXPO_OS === "ios") {
    return Constants.platform?.ios?.buildNumber ?? null;
  }

  if (process.env.EXPO_OS === "android") {
    return Constants.platform?.android?.versionCode?.toString() ?? null;
  }

  return null;
}

// The native "Build" number above never changes when an OTA update is applied - it's
// baked into the binary. This is the only on-device way to tell whether the JS bundle
// currently running came from an EAS Update or is still the one embedded at build time.
function UpdateInfo() {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const checkNow = async () => {
    if (!Updates.isEnabled) {
      setMessage("Atualizações OTA desabilitadas neste build.");
      return;
    }
    setChecking(true);
    setMessage(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setMessage("Nenhuma atualização nova disponível.");
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert(
        "Atualização baixada",
        "Reiniciar o app agora para aplicar?",
        [
          { text: "Depois", style: "cancel" },
          { text: "Reiniciar", onPress: () => Updates.reloadAsync() }
        ]
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao verificar atualização.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.infoCard}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Origem do JS</Text>
        <Text selectable style={styles.infoValue}>
          {Updates.isEmbeddedLaunch ? "Embutido no build" : "Atualização OTA"}
        </Text>
      </View>
      <View style={styles.separator} />
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Update ID</Text>
        <Text selectable style={styles.infoValueSmall}>{Updates.updateId ?? "—"}</Text>
      </View>
      <View style={styles.separator} />
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Canal</Text>
        <Text selectable style={styles.infoValue}>{Updates.channel ?? "—"}</Text>
      </View>
      <View style={styles.separator} />
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Publicado em</Text>
        <Text selectable style={styles.infoValueSmall}>
          {Updates.createdAt ? Updates.createdAt.toLocaleString("pt-BR") : "—"}
        </Text>
      </View>
      <View style={styles.separator} />
      <Pressable
        accessibilityRole="button"
        disabled={checking}
        onPress={checkNow}
        style={[styles.checkButton, checking ? styles.disabled : null]}
      >
        <Text style={styles.checkButtonText}>
          {checking ? "Verificando..." : "Verificar atualização agora"}
        </Text>
      </Pressable>
      {message ? <Text style={styles.updateMessage}>{message}</Text> : null}
    </View>
  );
}

export default function AboutScreen() {
  const appName = Constants.expoConfig?.name ?? "Monitriip Driver";
  const version = Constants.expoConfig?.version ?? "—";
  const build = getNativeBuildVersion();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <StatusBar style="dark" />
      <Stack.Title>Sobre</Stack.Title>

      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <Text style={styles.logoLetter}>M</Text>
        </View>
        <Text selectable style={styles.appName}>{appName}</Text>
        <Text selectable style={styles.summary}>
          Aplicativo do motorista para gerenciamento e acompanhamento de viagens.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Versão</Text>
          <Text selectable style={styles.infoValue}>{version}</Text>
        </View>
        {build ? (
          <>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text selectable style={styles.infoValue}>{build}</Text>
            </View>
          </>
        ) : null}
      </View>

      <UpdateInfo />

      <Text selectable style={styles.versionLine}>
        {build ? `Versão ${version} (${build})` : `Versão ${version}`}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: 24,
    padding: 20,
    paddingBottom: 48,
    backgroundColor: "#f3f7f6"
  },
  hero: {
    alignItems: "center",
    gap: 12,
    paddingTop: 28,
    paddingBottom: 12
  },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
    boxShadow: "0 8px 20px rgba(15, 118, 110, 0.2)"
  },
  logoLetter: {
    color: "#ffffff",
    fontSize: 46,
    fontWeight: "900"
  },
  appName: {
    color: "#102a2e",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center"
  },
  summary: {
    maxWidth: 360,
    color: "#667a7e",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center"
  },
  infoCard: {
    borderRadius: 18,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#dce6e4",
    paddingHorizontal: 17,
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 14px rgba(15, 45, 49, 0.04)"
  },
  infoRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },
  infoLabel: {
    color: "#526a6e",
    fontSize: 15,
    fontWeight: "700"
  },
  infoValue: {
    color: "#102a2e",
    fontSize: 15,
    fontWeight: "900",
    fontVariant: ["tabular-nums"]
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#dce6e4"
  },
  infoValueSmall: {
    flexShrink: 1,
    color: "#102a2e",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right"
  },
  checkButton: {
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8
  },
  disabled: {
    opacity: 0.5
  },
  checkButtonText: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "800"
  },
  updateMessage: {
    color: "#667a7e",
    fontSize: 13,
    textAlign: "center",
    paddingBottom: 12
  },
  versionLine: {
    color: "#819195",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    fontVariant: ["tabular-nums"]
  }
});
