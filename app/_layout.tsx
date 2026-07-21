import { Stack } from "expo-router";

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
    </Stack>
  );
}
