import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import {
  authenticate,
  completePasswordReset,
  endSession,
  getAuthErrorMessage,
  requestPasswordReset,
  restoreSession
} from "./auth";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { isScreenshotMode, screenshotEmail, screenshotVehicles } from "./screenshot-data";
import { getVehicles, type Vehicle } from "./vehicle-api";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const screenshotMode = isScreenshotMode();
  const [authenticatedUser, setAuthenticatedUser] = useState<string | null>(null);
  const [restoringSession, setRestoringSession] = useState(!screenshotMode);

  useEffect(() => {
    if (screenshotMode) {
      return;
    }

    restoreSession()
      .then(setAuthenticatedUser)
      .finally(() => setRestoringSession(false));
  }, [screenshotMode]);

  async function logout() {
    try {
      await endSession();
    } finally {
      setAuthenticatedUser(null);
    }
  }

  if (restoringSession) {
    return (
      <View style={styles.sessionLoader}>
        <StatusBar style="light" />
        <ActivityIndicator color="#2dd4bf" size="large" />
        <Text style={styles.sessionLoaderText}>A carregar sessão…</Text>
      </View>
    );
  }

  if (screenshotMode) {
    return <DriverConsole email={screenshotEmail} onLogout={logout} screenshotMode />;
  }

  if (!authenticatedUser) {
    return <LoginScreen onLogin={setAuthenticatedUser} />;
  }

  return <DriverConsole email={authenticatedUser} onLogout={logout} />;
}

type LoginScreenProps = {
  onLogin: (email: string) => void;
};

function LoginScreen({ onLogin }: LoginScreenProps) {
  const { width } = useWindowDimensions();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetDestination, setResetDestination] = useState("");
  const [mode, setMode] = useState<"login" | "recover" | "confirm">("login");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const compact = width < 390;

  async function submitLogin() {
    if (!username.trim()) {
      setError("Introduza o seu utilizador.");
      return;
    }

    if (!password) {
      setError("Introduza a sua palavra-passe.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      onLogin(await authenticate(username, password));
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  }

  async function submitRecoveryRequest() {
    if (!username.trim()) {
      setError("Introduza o utilizador associado à conta.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await requestPasswordReset(username);
      setUsername(result.username);
      setResetDestination(result.destination);
      setMode("confirm");
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword() {
    if (confirmationCode.trim().length !== 6) {
      setError("Introduza o código de 6 dígitos recebido.");
      return;
    }

    if (newPassword.length < 8) {
      setError("A nova palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await completePasswordReset(username, confirmationCode, newPassword);
      setPassword("");
      setConfirmationCode("");
      setNewPassword("");
      setMode("login");
      Alert.alert("Palavra-passe alterada", "Já pode entrar com a nova palavra-passe.");
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      style={styles.loginRoot}
    >
      <StatusBar style="light" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.loginScrollContent}
      >
        <View style={[styles.loginShell, compact ? styles.loginShellCompact : null]}>
          <View style={styles.loginBrand}>
            <View style={styles.logoMark} accessibilityElementsHidden>
              <View style={styles.logoRoad} />
              <View style={styles.logoDot} />
            </View>
            <Text style={styles.brandName}>monitriip</Text>
            <Text style={styles.brandTagline}>Operações seguras, viagem após viagem.</Text>
          </View>

          <View style={styles.loginCard}>
            <View style={styles.loginHeading}>
              <Text style={styles.loginTitle}>{mode === "login" ? "Bem-vindo" : "Recuperar acesso"}</Text>
              <Text style={styles.loginSubtitle}>
                {mode === "login"
                  ? "Entre na sua conta de motorista para continuar."
                  : mode === "recover"
                    ? "Indique o utilizador associado à sua conta."
                    : `Introduza o código enviado para ${resetDestination}.`}
              </Text>
            </View>

            <View style={styles.loginFields}>
              <LoginField
                label="Utilizador"
                value={username}
                onChangeText={(value) => {
                  setUsername(value);
                  setError("");
                }}
                placeholder="O seu utilizador"
                editable={mode !== "confirm"}
              />

              {mode === "login" ? (
                <View style={styles.field}>
                  <View style={styles.passwordLabelRow}>
                    <Text style={styles.loginLabel}>Palavra-passe</Text>
                    <Pressable accessibilityRole="button" onPress={() => setPasswordVisible((value) => !value)}>
                      <Text style={styles.visibilityButton}>{passwordVisible ? "Ocultar" : "Mostrar"}</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    accessibilityLabel="Palavra-passe"
                    style={[styles.loginInput, error ? styles.loginInputError : null]}
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      setError("");
                    }}
                    placeholder="A sua palavra-passe"
                    placeholderTextColor="#8696a7"
                    secureTextEntry={!passwordVisible}
                    autoComplete="current-password"
                    returnKeyType="done"
                    onSubmitEditing={submitLogin}
                  />
                </View>
              ) : null}

              {mode === "confirm" ? (
                <>
                  <LoginField
                    label="Código de confirmação"
                    value={confirmationCode}
                    onChangeText={(value) => {
                      setConfirmationCode(value.replace(/\D/g, "").slice(0, 6));
                      setError("");
                    }}
                    placeholder="000000"
                    keyboardType="number-pad"
                  />
                  <LoginField
                    label="Nova palavra-passe"
                    value={newPassword}
                    onChangeText={(value) => {
                      setNewPassword(value);
                      setError("");
                    }}
                    placeholder="Mínimo de 8 caracteres"
                    secureTextEntry
                  />
                </>
              ) : null}
            </View>

            {error ? (
              <Text selectable accessibilityRole="alert" style={styles.loginError}>
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={mode === "login" ? submitLogin : mode === "recover" ? submitRecoveryRequest : submitNewPassword}
              style={({ pressed }) => [styles.loginButton, loading ? styles.buttonDisabled : null, pressed && !loading ? styles.loginButtonPressed : null]}
            >
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.loginButtonText}>{mode === "login" ? "Entrar" : mode === "recover" ? "Enviar código" : "Alterar palavra-passe"}</Text>}
              {!loading ? <Text style={styles.loginButtonArrow}>→</Text> : null}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => {
                setError("");
                setMode(mode === "login" ? "recover" : "login");
              }}
            >
              <Text style={styles.forgotPassword}>{mode === "login" ? "Esqueceu-se da palavra-passe?" : "Voltar ao início de sessão"}</Text>
            </Pressable>
          </View>

          <Text style={styles.loginFooter}>Acesso exclusivo a motoristas autorizados</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type LoginFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad";
  editable?: boolean;
  secureTextEntry?: boolean;
};

function LoginField({ label, value, onChangeText, placeholder, keyboardType = "default", editable = true, secureTextEntry = false }: LoginFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.loginLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.loginInput, !editable ? styles.loginInputDisabled : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8696a7"
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        secureTextEntry={secureTextEntry}
        returnKeyType="next"
      />
    </View>
  );
}

type DriverConsoleProps = {
  email: string;
  onLogout: () => void;
  screenshotMode?: boolean;
};

function DriverConsole({ email, onLogout, screenshotMode = false }: DriverConsoleProps) {
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState<Vehicle[]>(screenshotMode ? screenshotVehicles : []);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(!screenshotMode);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const vehicleListContentStyle = useMemo(
    () => [
      styles.vehicleListContent,
      {
        paddingTop: Math.max(styles.vehicleListContent.paddingTop, insets.top + 12)
      }
    ],
    [insets.top]
  );

  const loadVehicles = useCallback(async (refresh = false) => {
    if (screenshotMode) {
      setVehicles(screenshotVehicles);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError("");
      setVehicles(await getVehicles());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os veículos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [screenshotMode]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const visibleVehicles = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase("pt");
    if (!query) {
      return vehicles;
    }

    return vehicles.filter((vehicle) =>
      [vehicle.name, vehicle.attributes?.license_plate, vehicle.position?.address]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("pt").includes(query))
    );
  }, [filter, vehicles]);

  function selectVehicle(vehicle: Vehicle) {
    router.push({
      pathname: vehicle.attributes?.monitrip ? "/trip/[id]" : "/vehicle/[id]",
      params: { id: String(vehicle.id), ...(screenshotMode ? { screenshot: "1" } : {}) }
    });
  }

  const vehicleHeader = (
    <View style={styles.vehicleHeaderBlock}>
      <View style={styles.vehicleTopBar}>
        <View style={styles.vehicleHeading}>
          <Text style={styles.vehicleEyebrow}>Monitriip Motorista</Text>
          <Text style={styles.vehicleTitle}>Selecione um veículo</Text>
          <Text selectable style={styles.vehicleUser}>{email}</Text>
        </View>
        <View style={styles.vehicleHeaderActions}>
          <Pressable accessibilityRole="button" onPress={() => router.push("/about")} style={styles.aboutButton}>
            <Text style={styles.aboutButtonText}>Sobre</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel="Pesquisar veículos"
          value={filter}
          onChangeText={setFilter}
          placeholder="Pesquisar por nome ou placa"
          placeholderTextColor="#7b8b90"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {filter ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Limpar pesquisa" onPress={() => setFilter("")} style={styles.clearSearch}>
            <Text style={styles.clearSearchText}>×</Text>
          </Pressable>
        ) : null}
      </View>

      {!loading && !error ? (
        <View style={styles.vehicleCountRow}>
          <Text style={styles.vehicleCount}>{visibleVehicles.length} {visibleVehicles.length === 1 ? "veículo" : "veículos"}</Text>
          <Text style={styles.refreshHint}>Puxe para atualizar</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.vehicleErrorCard}>
          <Text selectable style={styles.vehicleErrorText}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => loadVehicles()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  if (screenshotMode) {
    return (
      <View style={styles.vehicleScreen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={vehicleListContentStyle}>
          {vehicleHeader}
          {visibleVehicles.map((item) => (
            <VehicleRow key={item.id} vehicle={item} onPress={() => selectVehicle(item)} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.vehicleScreen}>
      <StatusBar style="dark" />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={visibleVehicles}
        keyExtractor={(vehicle) => String(vehicle.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={vehicleListContentStyle}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadVehicles(true)} tintColor="#0f766e" />}
        ListHeaderComponent={vehicleHeader}
        renderItem={({ item }) => (
          <VehicleRow
            vehicle={item}
            onPress={() => selectVehicle(item)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.vehicleLoading}>
              <ActivityIndicator color="#0f766e" size="large" />
              <Text style={styles.vehicleLoadingText}>A carregar veículos…</Text>
            </View>
          ) : !error ? (
            <View style={styles.vehicleEmpty}>
              <Text style={styles.vehicleEmptyIcon}>▱</Text>
              <Text style={styles.vehicleEmptyTitle}>{filter ? "Nenhum resultado" : "Sem veículos disponíveis"}</Text>
              <Text style={styles.vehicleEmptyText}>{filter ? "Tente pesquisar por outro nome ou placa." : "Atualize a lista dentro de alguns segundos."}</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

type VehicleRowProps = {
  vehicle: Vehicle;
  onPress: () => void;
};

function VehicleRow({ vehicle, onPress }: VehicleRowProps) {
  const online = vehicle.status === "online";
  const ignition = Boolean(vehicle.position?.attributes?.ignition);
  const plate = vehicle.attributes?.license_plate;
  const address = vehicle.position?.address?.trim();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Selecionar veículo ${plate || vehicle.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.vehicleCard,
        pressed ? styles.vehicleCardPressed : null
      ]}
    >
      <View style={[styles.vehicleStateIcon, ignition ? styles.vehicleStateRunning : styles.vehicleStateStopped]}>
        <Text style={styles.vehicleStateGlyph}>{ignition ? "▶" : "■"}</Text>
      </View>
      <View style={styles.vehicleCardBody}>
        <View style={styles.vehicleNameRow}>
          <Text selectable numberOfLines={1} style={styles.vehicleName}>{vehicle.name}</Text>
          {online ? (
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.vehicleMetaRow}>
          {plate ? <Text selectable style={styles.vehiclePlate}>{plate}</Text> : null}
          <Text selectable style={styles.vehicleUpdated}>{formatVehicleUpdate(vehicle.lastUpdate)}</Text>
        </View>
        {address ? (
          <Text selectable numberOfLines={2} style={styles.vehicleAddress}>
            {address}
          </Text>
        ) : null}
      </View>
      <Text style={styles.vehicleChevron}>›</Text>
    </Pressable>
  );
}

function formatVehicleUpdate(value?: string) {
  if (!value) {
    return "Sem comunicação recente";
  }

  const updatedAt = new Date(value).getTime();
  if (!Number.isFinite(updatedAt)) {
    return "Atualização desconhecida";
  }

  const elapsedSeconds = Math.round((updatedAt - Date.now()) / 1000);
  const units: Array<[singular: string, plural: string, seconds: number]> = [
    ["dia", "dias", 86_400],
    ["hora", "horas", 3_600],
    ["minuto", "minutos", 60]
  ];

  for (const [singular, plural, seconds] of units) {
    if (Math.abs(elapsedSeconds) >= seconds) {
      const amount = Math.abs(Math.round(elapsedSeconds / seconds));
      const label = amount === 1 ? singular : plural;
      return elapsedSeconds < 0
        ? `há ${amount} ${label}`
        : `dentro de ${amount} ${label}`;
    }
  }

  return "agora mesmo";
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad";
};

function Field({ label, value, onChangeText, keyboardType = "default" }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="characters"
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
  vehicleScreen: {
    flex: 1,
    backgroundColor: "#f3f7f6"
  },
  vehicleListContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 10
  },
  vehicleHeaderBlock: {
    gap: 18,
    paddingBottom: 10
  },
  vehicleTopBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16
  },
  vehicleHeading: {
    flex: 1,
    gap: 2
  },
  vehicleHeaderActions: {
    alignItems: "flex-end",
    gap: 8
  },
  aboutButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e1efed",
    borderWidth: 1,
    borderColor: "#bdd8d4"
  },
  aboutButtonText: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800"
  },
  vehicleEyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  vehicleTitle: {
    color: "#102a2e",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8
  },
  vehicleUser: {
    color: "#667a7e",
    fontSize: 13,
    paddingTop: 2
  },
  searchBox: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 17,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#d6e1df",
    paddingHorizontal: 15,
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 14px rgba(15, 45, 49, 0.05)"
  },
  searchIcon: {
    color: "#0f766e",
    fontSize: 25,
    fontWeight: "700",
    paddingRight: 9,
    transform: [{ rotate: "-20deg" }]
  },
  searchInput: {
    flex: 1,
    minHeight: 52,
    color: "#102a2e",
    fontSize: 16,
    paddingVertical: 0
  },
  clearSearch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e7efee"
  },
  clearSearchText: {
    color: "#53686c",
    fontSize: 22,
    lineHeight: 24
  },
  vehicleCountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3
  },
  vehicleCount: {
    color: "#334e52",
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"]
  },
  refreshHint: {
    color: "#819195",
    fontSize: 12
  },
  vehicleCard: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderRadius: 19,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#dce6e4",
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 14px rgba(15, 45, 49, 0.04)"
  },
  vehicleCardSelected: {
    borderColor: "#0f766e",
    backgroundColor: "#f0fdfa"
  },
  vehicleCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }]
  },
  vehicleStateIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center"
  },
  vehicleStateRunning: {
    backgroundColor: "#dcfce7"
  },
  vehicleStateStopped: {
    backgroundColor: "#fee2e2"
  },
  vehicleStateGlyph: {
    color: "#173f43",
    fontSize: 15,
    fontWeight: "900"
  },
  vehicleCardBody: {
    flex: 1,
    gap: 7
  },
  vehicleNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  vehicleName: {
    flexShrink: 1,
    color: "#102a2e",
    fontSize: 17,
    fontWeight: "900"
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "#dcfce7"
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a"
  },
  onlineText: {
    color: "#166534",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  vehicleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  vehiclePlate: {
    color: "#36575c",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
    backgroundColor: "#e8efee",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  vehicleUpdated: {
    color: "#718387",
    fontSize: 12
  },
  vehicleAddress: {
    color: "#526a6e",
    fontSize: 13,
    lineHeight: 18
  },
  vehicleChevron: {
    color: "#7b8e91",
    fontSize: 30,
    fontWeight: "300"
  },
  vehicleLoading: {
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
    paddingVertical: 70
  },
  vehicleLoadingText: {
    color: "#607478",
    fontSize: 14,
    fontWeight: "700"
  },
  vehicleErrorCard: {
    gap: 12,
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 15,
    backgroundColor: "#fff1f0",
    borderWidth: 1,
    borderColor: "#ffd2cf"
  },
  vehicleErrorText: {
    color: "#9f2721",
    fontSize: 14,
    lineHeight: 20
  },
  retryButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    borderRadius: 11,
    borderCurve: "continuous",
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b42318"
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  vehicleEmpty: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 64
  },
  vehicleEmptyIcon: {
    color: "#89a09f",
    fontSize: 46
  },
  vehicleEmptyTitle: {
    color: "#28464a",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  vehicleEmptyText: {
    color: "#718387",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  sessionLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "#082f35"
  },
  sessionLoaderText: {
    color: "#a7c8c9",
    fontSize: 14,
    fontWeight: "700"
  },
  loginRoot: {
    flex: 1,
    backgroundColor: "#082f35"
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40
  },
  loginShell: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    gap: 26
  },
  loginShellCompact: {
    gap: 20
  },
  loginBrand: {
    alignItems: "center",
    gap: 7
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 21,
    borderCurve: "continuous",
    backgroundColor: "#2dd4bf",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "8deg" }],
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.24)"
  },
  logoRoad: {
    width: 18,
    height: 39,
    borderRadius: 9,
    backgroundColor: "#082f35",
    transform: [{ rotate: "-8deg" }]
  },
  logoDot: {
    position: "absolute",
    width: 5,
    height: 13,
    borderRadius: 3,
    backgroundColor: "#ccfbf1"
  },
  brandName: {
    color: "#ffffff",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -1.2
  },
  brandTagline: {
    color: "#a7c8c9",
    fontSize: 14,
    textAlign: "center"
  },
  loginCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    borderCurve: "continuous",
    padding: 24,
    gap: 20,
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28)"
  },
  loginHeading: {
    gap: 6
  },
  loginTitle: {
    color: "#0f2529",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.7
  },
  loginSubtitle: {
    color: "#5f7175",
    fontSize: 15,
    lineHeight: 21
  },
  loginFields: {
    gap: 15
  },
  loginLabel: {
    color: "#243c40",
    fontSize: 13,
    fontWeight: "800"
  },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  visibilityButton: {
    color: "#087f74",
    fontSize: 13,
    fontWeight: "800"
  },
  loginInput: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#d7e1e2",
    borderRadius: 15,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    color: "#102d31",
    backgroundColor: "#f7faf9",
    fontSize: 16
  },
  loginInputError: {
    borderColor: "#d24848"
  },
  loginInputDisabled: {
    color: "#5f7175",
    backgroundColor: "#edf3f2"
  },
  loginError: {
    color: "#b42318",
    backgroundColor: "#fff1f0",
    borderRadius: 12,
    borderCurve: "continuous",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "700"
  },
  loginButton: {
    minHeight: 55,
    borderRadius: 16,
    borderCurve: "continuous",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
    boxShadow: "0 8px 18px rgba(15, 118, 110, 0.25)"
  },
  loginButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }]
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  loginButtonArrow: {
    position: "absolute",
    right: 18,
    color: "#ccfbf1",
    fontSize: 22,
    fontWeight: "600"
  },
  forgotPassword: {
    color: "#0f766e",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: 2
  },
  loginFooter: {
    color: "#8fb6b8",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
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
  signedInAs: {
    color: "#64748b",
    fontSize: 12,
    paddingTop: 3
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 7
  },
  logoutButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1"
  },
  logoutText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800"
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
