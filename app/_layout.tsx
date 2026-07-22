import { Stack } from "expo-router";
import "../gps-tracking";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: "#0f766e",
        headerTitleStyle: { color: "#102a2e", fontWeight: "800" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#f3f7f6" }
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="vehicle/[id]"
        options={{ title: "Veículo", headerBackButtonDisplayMode: "minimal" }}
      />
      <Stack.Screen
        name="trip/[id]"
        options={{
          title: "Viagem em andamento",
          headerBackVisible: false,
          gestureEnabled: false
        }}
      />
    </Stack>
  );
}
