import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { startVehicleLocationTracking } from "../../gps-tracking";
import { isScreenshotMode, screenshotVehicles } from "../../screenshot-data";
import { getVehicles, toggleVehicleTrip, type Vehicle } from "../../vehicle-api";

export default function VehicleTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const screenshotMode = isScreenshotMode();
  const screenshotVehicle = screenshotVehicles.find((item) => String(item.id) === String(id)) || screenshotVehicles[0];
  const [vehicle, setVehicle] = useState<Vehicle | null>(screenshotMode ? screenshotVehicle : null);
  const [loading, setLoading] = useState(!screenshotMode);
  const [submitting, setSubmitting] = useState(false);
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);
  const [tripLicense, setTripLicense] = useState("");
  const [error, setError] = useState("");

  const loadVehicle = useCallback(async () => {
    if (screenshotMode) {
      setVehicle(screenshotVehicle);
      setTripLicense(String(screenshotVehicle.attributes?.notes ?? ""));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const vehicles = await getVehicles();
      const selected = vehicles.find((item) => String(item.id) === String(id));
      if (!selected) {
        throw new Error("Este veículo não está mais disponível.");
      }
      if (selected.attributes?.monitrip) {
        router.replace({ pathname: "/trip/[id]", params: { id: String(selected.id) } });
        return;
      }
      setVehicle(selected);
      setTripLicense(String(selected.attributes?.notes ?? ""));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o veículo.");
    } finally {
      setLoading(false);
    }
  }, [id, router, screenshotMode, screenshotVehicle]);

  useEffect(() => {
    loadVehicle();
  }, [loadVehicle]);

  async function updateTrip() {
    if (!vehicle) return;
    if (screenshotMode) return;

    if (!tripLicense.trim()) {
      setError("Por favor, informe a licença de viagem.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const result = await toggleVehicleTrip(vehicle, tripLicense);
      setVehicle(result.updatedVehicle);
      await startVehicleLocationTracking(result.updatedVehicle, tripLicense);
      router.replace({ pathname: "/trip/[id]", params: { id: String(vehicle.id) } });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar a viagem.");
    } finally {
      setSubmitting(false);
    }
  }

  function confirmTripUpdate() {
    if (!vehicle || submitting) return;
    setTripLicense("");
    setError("");
    setLicenseModalVisible(true);
  }

  const plate = vehicle?.attributes?.license_plate;
  const ignition = Boolean(vehicle?.position?.attributes?.ignition);
  const online = vehicle?.status === "online";

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ title: plate || vehicle?.name || "Veículo" }} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.muted}>Carregando veículo…</Text>
        </View>
      ) : vehicle ? (
        <>
          <View style={styles.hero}>
            <View style={[styles.stateIcon, ignition ? styles.running : styles.stopped]}>
              <Text style={styles.stateGlyph}>{ignition ? "▶" : "■"}</Text>
            </View>
            <Text selectable style={styles.name}>{vehicle.name}</Text>
            {plate ? <Text selectable style={styles.plate}>{plate}</Text> : null}
            <View style={styles.statusRow}>
              <View style={[styles.dot, online ? styles.dotOnline : styles.dotOffline]} />
              <Text style={styles.status}>{online ? "Online" : "Offline"}</Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.status}>Ignição {ignition ? "ligada" : "desligada"}</Text>
            </View>
          </View>

          {error ? <Text selectable accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          <View style={styles.actionCard}>
            <Text style={styles.sectionTitle}>Gerenciamento da viagem</Text>
            <Text style={styles.description}>
              Toque no botão para iniciar uma nova viagem.
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={confirmTripUpdate}
              style={({ pressed }) => [
                styles.button,
                styles.startButton,
                pressed && !submitting ? styles.pressed : null,
                submitting ? styles.disabled : null
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.startButtonText}>Iniciar viagem</Text>
              )}
            </Pressable>
          </View>

          <Modal
            animationType="fade"
            transparent
            visible={licenseModalVisible}
            onRequestClose={() => setLicenseModalVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Iniciar viagem</Text>
                <Text style={styles.modalDescription}>Informe a licença de viagem para continuar.</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Licença de viagem</Text>
                  <TextInput
                    accessibilityLabel="Licença de viagem"
                    autoFocus
                    value={tripLicense}
                    onChangeText={(value) => {
                      setTripLicense(value);
                      setError("");
                    }}
                    placeholder="Digite a licença"
                    placeholderTextColor="#7b8b90"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (tripLicense.trim()) {
                        setLicenseModalVisible(false);
                        updateTrip();
                      }
                    }}
                    style={styles.input}
                  />
                </View>
                {!tripLicense.trim() && error ? <Text style={styles.modalError}>{error}</Text> : null}
                <View style={styles.modalActions}>
                  <Pressable accessibilityRole="button" onPress={() => setLicenseModalVisible(false)} style={styles.modalCancel}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!tripLicense.trim() || submitting}
                    onPress={() => {
                      setLicenseModalVisible(false);
                      updateTrip();
                    }}
                    style={[styles.modalConfirm, !tripLicense.trim() || submitting ? styles.disabled : null]}
                  >
                    <Text style={styles.modalConfirmText}>Iniciar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Veículo indisponível</Text>
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
  content: { flexGrow: 1, padding: 20, gap: 18, backgroundColor: "#f3f7f6" },
  centered: { flex: 1, minHeight: 420, alignItems: "center", justifyContent: "center", gap: 14 },
  muted: { color: "#667a7e", fontSize: 14, lineHeight: 20, textAlign: "center" },
  hero: { alignItems: "center", gap: 9, paddingVertical: 28 },
  stateIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  running: { backgroundColor: "#dcfce7" },
  stopped: { backgroundColor: "#fee2e2" },
  stateGlyph: { color: "#173f43", fontSize: 23, fontWeight: "900" },
  name: { color: "#102a2e", fontSize: 28, fontWeight: "900", textAlign: "center", letterSpacing: -0.6 },
  plate: { color: "#36575c", fontSize: 14, fontWeight: "900", letterSpacing: 1, backgroundColor: "#e1eae8", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: "#16a34a" },
  dotOffline: { backgroundColor: "#94a3b8" },
  status: { color: "#607478", fontSize: 13, fontWeight: "700" },
  separator: { color: "#9aabad" },
  actionCard: { gap: 13, borderRadius: 24, padding: 20, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#dce6e4", boxShadow: "0 7px 22px rgba(15, 45, 49, 0.06)" },
  sectionTitle: { color: "#102a2e", fontSize: 20, fontWeight: "900" },
  description: { color: "#667a7e", fontSize: 14, lineHeight: 20, marginBottom: 5 },
  field: { gap: 7, marginBottom: 4 },
  label: { color: "#243c40", fontSize: 13, fontWeight: "800" },
  input: { minHeight: 54, borderWidth: 1, borderColor: "#d7e1e2", borderRadius: 15, paddingHorizontal: 16, color: "#102d31", backgroundColor: "#f7faf9", fontSize: 16 },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(8, 47, 53, 0.55)" },
  modalCard: { gap: 15, borderRadius: 24, padding: 22, backgroundColor: "#ffffff" },
  modalTitle: { color: "#102a2e", fontSize: 22, fontWeight: "900" },
  modalDescription: { color: "#667a7e", fontSize: 14, lineHeight: 20 },
  modalError: { color: "#b42318", fontSize: 13, fontWeight: "700" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingTop: 3 },
  modalCancel: { minHeight: 46, justifyContent: "center", paddingHorizontal: 16 },
  modalCancelText: { color: "#52676b", fontSize: 15, fontWeight: "800" },
  modalConfirm: { minHeight: 46, justifyContent: "center", borderRadius: 13, paddingHorizontal: 20, backgroundColor: "#0f766e" },
  modalConfirmText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  button: { minHeight: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  startButton: { backgroundColor: "#0f766e" },
  startButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.55 },
  error: { color: "#9f2721", backgroundColor: "#fff1f0", borderRadius: 14, padding: 14, fontSize: 14, lineHeight: 20 },
  errorTitle: { color: "#102a2e", fontSize: 20, fontWeight: "900" },
  retryButton: { minHeight: 46, borderRadius: 13, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#0f766e" },
  retryText: { color: "#ffffff", fontSize: 14, fontWeight: "900" }
});
