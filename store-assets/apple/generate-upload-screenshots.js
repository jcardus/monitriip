const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const OUT_DIR = path.join(__dirname, "upload");

const colors = {
  bg: "#f8fafc",
  panel: "#ffffff",
  ink: "#0f172a",
  muted: "#475569",
  meta: "#64748b",
  border: "#e2e8f0",
  inputBorder: "#cbd5e1",
  teal: "#0f766e",
  green: "#dcfce7",
  red: "#b91c1c",
  soft: "#e2e8f0",
  code: "#f1f5f9",
  darkText: "#cbd5e1"
};

const files = [
  { file: "iphone-01-viagem-ativa.png", width: 1284, height: 2778, scale: 3, screen: "top" },
  { file: "iphone-02-evidencias.png", width: 1284, height: 2778, scale: 3, screen: "evidence" },
  { file: "ipad-01-viagem-ativa.png", width: 2064, height: 2752, scale: 2, screen: "top" },
  { file: "ipad-02-evidencias.png", width: 2064, height: 2752, scale: 2, screen: "evidence" }
];

const state = {
  trip: {
    driverName: "CARLOS ALMEIDA",
    driverCpf: "12345678901",
    vehiclePlate: "BUS7A21",
    serviceOrder: "OS-2026-0714",
    routeCode: "RJ-SP-430",
    origin: "RIO DE JANEIRO",
    destination: "SAO PAULO"
  },
  route: "RIO DE JANEIRO para SAO PAULO",
  permissions: "autorizada em primeiro e segundo plano",
  gps: "248 pontos",
  lastSync: "Nunca",
  passengerDoc: "MG1234567",
  seat: "18",
  occurrence: "Fiscalização rodoviária concluída no posto BR-116 KM 184. Viagem seguiu sem atraso.",
  events: [
    ["Assento 18", "Documento do passageiro MG1234567", "21/07/2026, 09:18"],
    ["Ocorrência operacional", "Fiscalização concluída no posto BR-116 KM 184.", "21/07/2026, 11:42"]
  ]
};

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function px(value, scale) {
  return Math.round(value * scale * 100) / 100;
}

function text(x, y, value, size, weight, fill, scale, extra = "") {
  return `<text x="${px(x, scale)}" y="${px(y, scale)}" font-size="${px(size, scale)}" font-weight="${weight}" fill="${fill}" ${extra}>${esc(value)}</text>`;
}

function multiline(x, y, lines, size, weight, fill, scale, lineHeight = size * 1.3) {
  return lines.map((line, index) => text(x, y + index * lineHeight, line, size, weight, fill, scale)).join("");
}

function rect(x, y, width, height, radius, fill, scale, stroke = "", strokeWidth = 0) {
  const strokeAttrs = stroke ? ` stroke="${stroke}" stroke-width="${px(strokeWidth, scale)}"` : "";
  return `<rect x="${px(x, scale)}" y="${px(y, scale)}" width="${px(width, scale)}" height="${px(height, scale)}" rx="${px(radius, scale)}" fill="${fill}"${strokeAttrs}/>`;
}

function button(x, y, label, width, variant, scale, disabled = false) {
  const fill = disabled ? colors.soft : variant === "primary" ? colors.teal : variant === "danger" ? colors.red : colors.soft;
  const textColor = variant === "primary" || variant === "danger" ? "#ffffff" : colors.ink;
  return `
    ${rect(x, y, width, 44, 8, fill, scale)}
    ${text(x + 14, y + 29, label, 15, 800, textColor, scale)}
  `;
}

function field(x, y, width, label, value, scale) {
  return `
    ${text(x, y + 12, label.toUpperCase(), 12, 700, colors.muted, scale)}
    ${rect(x, y + 20, width, 46, 8, colors.panel, scale, colors.inputBorder, 1)}
    ${text(x + 12, y + 50, value, 16, 600, colors.ink, scale)}
  `;
}

function statusBar(width, scale) {
  const pointWidth = width / scale;
  return `
    ${text(16, 24, "09:41", 13, 700, colors.ink, scale)}
    <circle cx="${px(pointWidth - 44, scale)}" cy="${px(18, scale)}" r="${px(3, scale)}" fill="${colors.ink}"/>
    ${rect(pointWidth - 32, 12, 18, 9, 3, "none", scale, colors.ink, 1.4)}
    ${rect(pointWidth - 13, 15, 2, 4, 1, colors.ink, scale)}
  `;
}

function header(y, width, scale, status = "Rastreando") {
  const pointWidth = width / scale;
  const pillWidth = status.length > 9 ? 94 : 82;
  return `
    ${text(16, y + 13, "Operação ANTT Monitriip", 13, 700, colors.teal, scale)}
    ${text(16, y + 45, "Console do Motorista", 28, 800, colors.ink, scale)}
    ${rect(pointWidth - 16 - pillWidth, y + 2, pillWidth, 33, 8, status === "Rastreando" ? colors.green : colors.soft, scale)}
    ${text(pointWidth - pillWidth - 5, y + 24, status, 12, 800, colors.ink, scale)}
  `;
}

function panel(x, y, width, height, scale) {
  return rect(x, y, width, height, 8, colors.panel, scale, colors.border, 1);
}

function tripSetup(x, y, width, scale) {
  const fieldGap = 10;
  const fieldWidth = (width - 28 - fieldGap) / 2;
  const left = x + 14;
  const right = left + fieldWidth + fieldGap;
  return `
    ${panel(x, y, width, 480, scale)}
    ${text(left, y + 34, "Preparação da viagem", 18, 800, colors.ink, scale)}
    ${field(left, y + 48, width - 28, "Nome do motorista", state.trip.driverName, scale)}
    ${field(left, y + 118, width - 28, "CPF do motorista", state.trip.driverCpf, scale)}
    ${field(left, y + 188, width - 28, "Placa do veículo", state.trip.vehiclePlate, scale)}
    ${field(left, y + 258, width - 28, "Ordem de serviço", state.trip.serviceOrder, scale)}
    ${field(left, y + 328, width - 28, "Código da linha", state.trip.routeCode, scale)}
    ${field(left, y + 398, fieldWidth, "Origem", state.trip.origin, scale)}
    ${field(right, y + 398, fieldWidth, "Destino", state.trip.destination, scale)}
  `;
}

function summary(x, y, width, scale) {
  return `
    ${rect(x, y, width, 224, 8, colors.ink, scale)}
    ${text(x + 16, y + 32, state.route, 20, 800, "#ffffff", scale)}
    ${text(x + 16, y + 60, `Permissões: ${state.permissions}`, 13, 500, colors.darkText, scale)}
    ${text(x + 16, y + 82, `GPS na fila: ${state.gps}`, 13, 500, colors.darkText, scale)}
    ${text(x + 16, y + 104, `Última sincronização: ${state.lastSync}`, 13, 500, colors.darkText, scale)}
    ${button(x + 16, y + 116, "Iniciar viagem", 132, "primary", scale, true)}
    ${button(x + 156, y + 116, "Encerrar viagem", 142, "danger", scale)}
    ${button(x + 16, y + 166, "Sincronizar", 108, "default", scale)}
  `;
}

function boarding(x, y, width, scale) {
  const docWidth = width - 28 - 102;
  return `
    ${panel(x, y, width, 192, scale)}
    ${text(x + 14, y + 34, "Embarcar passageiro", 18, 800, colors.ink, scale)}
    ${field(x + 14, y + 48, docWidth, "Documento", state.passengerDoc, scale)}
    ${field(x + 14 + docWidth + 10, y + 48, 92, "Assento", state.seat, scale)}
    ${button(x + 14, y + 128, "Registrar embarque", 174, "primary", scale)}
  `;
}

function occurrence(x, y, width, scale) {
  return `
    ${panel(x, y, width, 220, scale)}
    ${text(x + 14, y + 34, "Ocorrência", 18, 800, colors.ink, scale)}
    ${rect(x + 14, y + 48, width - 28, 82, 8, colors.panel, scale, colors.inputBorder, 1)}
    ${multiline(x + 26, y + 74, ["Fiscalização rodoviária concluída no posto BR-116", "KM 184. Viagem seguiu sem atraso."], 14, 500, colors.ink, scale)}
    ${button(x + 14, y + 156, "Registrar ocorrência", 188, "default", scale)}
  `;
}

function evidence(x, y, width, scale) {
  let rows = "";
  let currentY = y + 58;
  for (const [title, detail, time] of state.events) {
    rows += `<line x1="${px(x + 14, scale)}" y1="${px(currentY, scale)}" x2="${px(x + width - 14, scale)}" y2="${px(currentY, scale)}" stroke="${colors.border}" stroke-width="${px(1, scale)}"/>`;
    rows += text(x + 14, currentY + 26, title, 15, 800, colors.ink, scale);
    rows += text(x + 14, currentY + 48, detail, 14, 500, colors.muted, scale);
    rows += text(x + 14, currentY + 68, time, 12, 500, colors.meta, scale);
    currentY += 92;
  }

  return `
    ${panel(x, y, width, 252, scale)}
    ${text(x + 14, y + 34, "Evidências da viagem", 18, 800, colors.ink, scale)}
    ${rows}
  `;
}

function exportPacket(x, y, width, scale) {
  const json = [
    "{",
    '  "trip": "trip-20260721-rjsp",',
    '  "placaVeiculo": "BUS7A21",',
    '  "ordemServico": "OS-2026-0714",',
    '  "gpsPendente": 0,',
    '  "eventos": ["embarque", "ocorrencia"],',
    '  "status": "finalizada"',
    "}"
  ];
  return `
    ${panel(x, y, width, 236, scale)}
    ${text(x + 14, y + 34, "Pacote de exportação", 18, 800, colors.ink, scale)}
    ${rect(x + 14, y + 48, width - 28, 172, 8, colors.code, scale)}
    ${multiline(x + 24, y + 68, json, 11, 500, colors.muted, scale, 17)}
  `;
}

function phoneScreen(config) {
  const { width, height, scale, screen } = config;
  const pointWidth = width / scale;
  const contentX = 16;
  const contentWidth = pointWidth - 32;
  const startY = 46;

  const body = screen === "top"
    ? `
      ${header(startY, width, scale)}
      ${tripSetup(contentX, 116, contentWidth, scale)}
      ${summary(contentX, 610, contentWidth, scale)}
      ${boarding(contentX, 848, contentWidth, scale)}
    `
    : `
      ${boarding(contentX, 46, contentWidth, scale)}
      ${occurrence(contentX, 252, contentWidth, scale)}
      ${evidence(contentX, 486, contentWidth, scale)}
      ${exportPacket(contentX, 752, contentWidth, scale)}
    `;

  return svgShell(width, height, scale, body);
}

function tabletScreen(config) {
  const { width, height, scale, screen } = config;
  const pointWidth = width / scale;
  const contentX = 28;
  const contentWidth = pointWidth - 56;
  const leftW = (contentWidth - 16) * 0.54;
  const rightW = contentWidth - leftW - 16;
  const rightX = contentX + leftW + 16;

  const body = screen === "top"
    ? `
      ${header(54, width, scale)}
      ${tripSetup(contentX, 136, leftW, scale)}
      ${summary(rightX, 136, rightW, scale)}
      ${boarding(rightX, 378, rightW, scale)}
      ${occurrence(rightX, 584, rightW, scale)}
      ${evidence(contentX, 840, contentWidth, scale)}
    `
    : `
      ${boarding(contentX, 54, leftW, scale)}
      ${occurrence(rightX, 54, rightW, scale)}
      ${evidence(contentX, 306, contentWidth, scale)}
      ${exportPacket(contentX, 582, contentWidth, scale)}
    `;

  return svgShell(width, height, scale, body);
}

function svgShell(width, height, scale, body) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <style>
        text {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Arial, sans-serif;
          letter-spacing: 0;
        }
      </style>
      <rect width="${width}" height="${height}" fill="${colors.bg}"/>
      ${statusBar(width, scale)}
      ${body}
    </svg>
  `;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const file of files) {
    const markup = file.width > 1500 ? tabletScreen(file) : phoneScreen(file);
    await sharp(Buffer.from(markup))
      .flatten({ background: colors.bg })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, file.file));
    console.log(`${file.file} ${file.width}x${file.height}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
