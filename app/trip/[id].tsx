import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { stopVehicleLocationTracking } from "../../gps-tracking";
import { getVehicles, toggleVehicleTrip, type Vehicle } from "../../vehicle-api";

export default function ActiveTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadVehicle = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const vehicles = await getVehicles();
      const selected = vehicles.find((item) => String(item.id) === String(id));
      if (!selected) {
        throw new Error("Este veículo não está mais disponível.");
      }
      if (!selected.attributes?.monitrip) {
        router.replace({ pathname: "/vehicle/[id]", params: { id: String(selected.id) } });
        return;
      }
      setVehicle(selected);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a viagem.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadVehicle();
  }, [loadVehicle]);

  async function endTrip() {
    if (!vehicle || submitting) return;

    try {
      setSubmitting(true);
      setError("");
      const license = String(vehicle.attributes?.notes ?? "");
      const result = await toggleVehicleTrip(vehicle, license);
      await stopVehicleLocationTracking();
      Alert.alert(
        "Viagem terminada",
        result.message || `${vehicle.attributes?.license_plate || vehicle.name} foi atualizado com sucesso.`,
        [{ text: "OK", onPress: () => router.replace("/") }]
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível terminar a viagem.");
    } finally {
      setSubmitting(false);
    }
  }

  function confirmEndTrip() {
    Alert.alert("Terminar viagem?", "Deseja terminar a viagem?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Terminar", style: "destructive", onPress: endTrip }
    ]);
  }

  const plate = vehicle?.attributes?.license_plate;
  const license = String(vehicle?.attributes?.notes ?? "").trim();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ title: "Viagem em andamento" }} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.muted}>Carregando viagem…</Text>
        </View>
      ) : vehicle ? (
        <View style={styles.tripCard}>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Viagem em andamento</Text>
          </View>
          <Text selectable style={styles.name}>{vehicle.name}</Text>
          {plate ? <Text selectable style={styles.plate}>{plate}</Text> : null}
          {license ? (
            <View style={styles.licenseBox}>
              <Text style={styles.licenseLabel}>Licença de viagem</Text>
              <Text selectable style={styles.licenseValue}>{license}</Text>
            </View>
          ) : null}

          {error ? <Text selectable accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={confirmEndTrip}
            style={({ pressed }) => [
              styles.finishButton,
              pressed && !submitting ? styles.pressed : null,
              submitting ? styles.disabled : null
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#b42318" />
            ) : (
              <Text style={styles.finishButtonText}>Terminar viagem</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Viagem indisponível</Text>
          {error ? <Text selectable style={styles.muted}>{error}</Text> : null}
          <Pressable accessibilityRole="button" onPress={loadVehicle} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 20, backgroundColor: "#f3f7f6" },
  centered: { flex: 1, minHeight: 420, alignItems: "center", justifyContent: "center", gap: 14 },
  muted: { color: "#667a7e", fontSize: 14, lineHeight: 20, textAlign: "center" },
  tripCard: { flex: 1, minHeight: 500, alignItems: "center", justifyContent: "center", gap: 18 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: "#dcfce7" },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16a34a" },
  activeText: { color: "#166534", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  name: { color: "#102a2e", fontSize: 30, fontWeight: "900", textAlign: "center" },
  plate: { color: "#36575c", fontSize: 15, fontWeight: "900", letterSpacing: 1, backgroundColor: "#e1eae8", borderRadius: 8, paddingHorizontal: 11, paddingVertical: 6 },
  licenseBox: { width: "100%", gap: 6, borderRadius: 18, padding: 18, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#dce6e4" },
  licenseLabel: { color: "#667a7e", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  licenseValue: { color: "#102a2e", fontSize: 20, fontWeight: "900" },
  finishButton: { width: "100%", minHeight: 58, alignItems: "center", justifyContent: "center", borderRadius: 17, borderWidth: 1.5, borderColor: "#d92d20", backgroundColor: "#fff7f6", marginTop: 12 },
  finishButtonText: { color: "#b42318", fontSize: 17, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.55 },
  error: { width: "100%", color: "#9f2721", backgroundColor: "#fff1f0", borderRadius: 14, padding: 14, fontSize: 14, lineHeight: 20 },
  errorTitle: { color: "#102a2e", fontSize: 20, fontWeight: "900" },
  retryButton: { minHeight: 46, borderRadius: 13, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#0f766e" },
  retryText: { color: "#ffffff", fontSize: 14, fontWeight: "900" }
});
