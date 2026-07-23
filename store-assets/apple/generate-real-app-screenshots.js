const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const Module = require("node:module");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { pathToFileURL } = require("node:url");
const ts = require("typescript");

const execFileAsync = promisify(execFile);
const ROOT = path.join(__dirname, "..", "..");
const OUT_DIR = path.join(__dirname, "upload");

const targets = [
  {
    file: "iphone-01-veiculos.png",
    width: 1284,
    height: 2778,
    scale: 2,
    screen: "vehicles"
  },
  {
    file: "iphone-02-viagem-ativa.png",
    width: 1284,
    height: 2778,
    scale: 2,
    screen: "trip"
  },
  {
    file: "ipad-01-veiculos.png",
    width: 2064,
    height: 2752,
    scale: 2,
    screen: "vehicles"
  },
  {
    file: "ipad-02-viagem-ativa.png",
    width: 2064,
    height: 2752,
    scale: 2,
    screen: "trip"
  }
];

function installTranspiler(screen) {
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === "react-native") {
      return createReactNativeWebShim();
    }

    if (request === "expo-router") {
      return {
        router: { push() {} },
        useRouter: () => ({ back() {}, push() {} }),
        useLocalSearchParams: () => ({ id: "101", screenshot: "1" }),
        Stack: {
          Screen: () => null
        }
      };
    }

    if (request === "expo-status-bar") {
      return { StatusBar: () => null };
    }

    if (request === "react-native-safe-area-context") {
      const React = originalLoad.call(this, "react", parent, isMain);
      return {
        SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
        SafeAreaView: ({ children }) => React.createElement(React.Fragment, null, children),
        useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
      };
    }

    if (request.endsWith("/auth") || request === "./auth" || request === "../../auth") {
      return {
        authenticate: async () => "screenshot@monitriip.local",
        completePasswordReset: async () => undefined,
        endSession: async () => undefined,
        getAuthErrorMessage: () => "Erro de autenticação",
        requestPasswordReset: async () => ({ username: "screenshot", destination: "email" }),
        restoreSession: async () => null
      };
    }

    if (request.endsWith("/vehicle-api") || request === "./vehicle-api" || request === "../../vehicle-api") {
      const { screenshotVehicles } = originalLoad.call(this, path.join(ROOT, "screenshot-data.ts"), parent, isMain);
      return {
        getVehicles: async () => screenshotVehicles,
        toggleVehicleTrip: async (vehicle, tripLicense) => ({
          updatedVehicle: {
            ...vehicle,
            attributes: {
              ...vehicle.attributes,
              monitrip: !vehicle.attributes?.monitrip,
              notes: tripLicense
            }
          },
          message: "Viagem atualizada"
        })
      };
    }

    if (request.endsWith("/gps-tracking") || request === "./gps-tracking" || request === "../../gps-tracking") {
      return {
        startVehicleLocationTracking: async () => undefined,
        stopVehicleLocationTracking: async () => undefined
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  global.location = { search: "?screenshot=1" };
  global.window = { location: global.location };
  global.navigator = { product: "ReactNative" };
  global.__DEV__ = false;
  process.env.EXPO_OS = "web";
  process.env.MONITRIIP_SCREENSHOT_SCREEN = screen;

  for (const ext of [".ts", ".tsx"]) {
    require.extensions[ext] = function compile(module, filename) {
      const source = require("node:fs").readFileSync(filename, "utf8");
      const result = ts.transpileModule(source, {
        fileName: filename,
        compilerOptions: {
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020
        }
      });
      module._compile(result.outputText, filename);
    };
  }
}

function createReactNativeWebShim() {
  const web = (modulePath) => {
    const value = require(modulePath);
    return value.default || value;
  };

  return {
    ActivityIndicator: web("react-native-web/dist/cjs/exports/ActivityIndicator"),
    Alert: { alert() {} },
    FlatList: web("react-native-web/dist/cjs/exports/FlatList"),
    KeyboardAvoidingView: web("react-native-web/dist/cjs/exports/KeyboardAvoidingView"),
    Linking: { openSettings() {} },
    Modal: web("react-native-web/dist/cjs/exports/Modal"),
    Platform: web("react-native-web/dist/cjs/exports/Platform"),
    Pressable: web("react-native-web/dist/cjs/exports/Pressable"),
    RefreshControl: () => null,
    ScrollView: web("react-native-web/dist/cjs/exports/ScrollView"),
    StyleSheet: web("react-native-web/dist/cjs/exports/StyleSheet"),
    Text: web("react-native-web/dist/cjs/exports/Text"),
    TextInput: web("react-native-web/dist/cjs/exports/TextInput"),
    useWindowDimensions: () => ({ width: Number(process.env.SCREENSHOT_WIDTH || 390), height: Number(process.env.SCREENSHOT_HEIGHT || 844), scale: 1, fontScale: 1 }),
    View: web("react-native-web/dist/cjs/exports/View")
  };
}

function clearAppModules() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(ROOT) && !key.includes("node_modules")) {
      delete require.cache[key];
    }
  }
}

function renderScreen(screen) {
  clearAppModules();
  installTranspiler(screen);

  const React = require("react");
  const ReactDOMServer = require("react-dom/server");
  const AppRegistryExport = require("react-native-web/dist/cjs/exports/AppRegistry");
  const AppRegistry = AppRegistryExport.default || AppRegistryExport;
  const ViewExport = require("react-native-web/dist/cjs/exports/View");
  const View = ViewExport.default || ViewExport;

  const Component = screen === "trip"
    ? require(path.join(ROOT, "app/trip/[id].tsx")).default
    : require(path.join(ROOT, "App.tsx")).default;

  function ScreenshotRoot() {
    return React.createElement(View, { style: { flex: 1 } }, React.createElement(Component));
  }

  const appKey = `MonitriipScreenshot${screen}`;
  AppRegistry.registerComponent(appKey, () => ScreenshotRoot);
  const { element, getStyleElement } = AppRegistry.getApplication(appKey);
  const styles = ReactDOMServer.renderToStaticMarkup(getStyleElement());
  const body = ReactDOMServer.renderToString(element);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body, #root {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #f3f7f6;
      }
      * {
        box-sizing: border-box;
      }
    </style>
    ${styles}
  </head>
  <body>
    <div id="root">${body}</div>
  </body>
</html>`;
}

async function findChrome() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch (error) {
      // Try the next browser path.
    }
  }

  throw new Error("Google Chrome, Chromium, or Microsoft Edge is required to generate real app screenshots.");
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const chrome = await findChrome();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "monitriip-real-app-screens-"));

  for (const target of targets) {
    console.log(`Rendering ${target.file} from ${target.screen} screen...`);
    const layoutWidth = target.width / target.scale;
    const layoutHeight = target.height / target.scale;
    process.env.SCREENSHOT_WIDTH = String(layoutWidth);
    process.env.SCREENSHOT_HEIGHT = String(layoutHeight);
    const html = renderScreen(target.screen);
    const htmlPath = path.join(tempDir, target.file.replace(/\.png$/, ".html"));
    const outputPath = path.join(OUT_DIR, target.file);
    await fs.writeFile(htmlPath, html);
    await execFileAsync(chrome, [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--force-device-scale-factor=${target.scale}`,
      `--window-size=${layoutWidth},${layoutHeight}`,
      `--screenshot=${outputPath}`,
      pathToFileURL(htmlPath).href
    ]);
    console.log(`${target.file} ${target.width}x${target.height}`);
  }

  await fs.rm(tempDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
