const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const outDir = __dirname;
const outFile = path.join(outDir, "feature-graphic.png");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1024" y2="500" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0f766e"/>
      <stop offset="0.58" stop-color="#0b5f76"/>
      <stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#06101f" flood-opacity="0.28"/>
    </filter>
    <style>
      text {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Arial, sans-serif;
        letter-spacing: 0;
      }
    </style>
  </defs>

  <rect width="1024" height="500" fill="url(#bg)"/>
  <path d="M-40 420 C120 325, 210 295, 348 308 C506 323, 620 244, 752 150 C834 92, 918 68, 1064 82" fill="none" stroke="#99f6e4" stroke-width="28" stroke-linecap="round" opacity="0.18"/>
  <path d="M-20 446 C130 350, 220 325, 352 338 C520 354, 640 256, 776 166 C858 112, 930 92, 1046 102" fill="none" stroke="#ecfeff" stroke-width="8" stroke-linecap="round" stroke-dasharray="24 26" opacity="0.8"/>

  <text x="64" y="110" font-size="29" font-weight="800" fill="#99f6e4">MONITRIIP DRIVER</text>
  <text x="64" y="180" font-size="56" font-weight="900" fill="#ffffff">Operação em rota</text>
  <text x="64" y="242" font-size="56" font-weight="900" fill="#ffffff">com GPS ativo</text>
  <text x="64" y="298" font-size="28" font-weight="600" fill="#d1fae5">Viagem, embarques e ocorrências</text>
  <text x="64" y="335" font-size="28" font-weight="600" fill="#d1fae5">em um console para motoristas.</text>

  <g filter="url(#shadow)">
    <rect x="680" y="54" width="260" height="392" rx="34" fill="#f8fafc"/>
    <rect x="710" y="96" width="132" height="14" rx="7" fill="#0f766e"/>
    <text x="710" y="142" font-size="30" font-weight="900" fill="#0f172a">Console do</text>
    <text x="710" y="176" font-size="30" font-weight="900" fill="#0f172a">Motorista</text>
    <rect x="710" y="208" width="200" height="86" rx="10" fill="#0f172a"/>
    <text x="728" y="239" font-size="16" font-weight="800" fill="#ffffff">RIO para SÃO PAULO</text>
    <text x="728" y="264" font-size="13" font-weight="500" fill="#cbd5e1">GPS na fila: 248 pontos</text>
    <rect x="728" y="308" width="80" height="36" rx="8" fill="#b91c1c"/>
    <text x="741" y="331" font-size="13" font-weight="800" fill="#ffffff">Encerrar</text>
    <rect x="820" y="308" width="90" height="36" rx="8" fill="#e2e8f0"/>
    <text x="832" y="331" font-size="13" font-weight="800" fill="#0f172a">Sincronizar</text>
    <rect x="710" y="362" width="200" height="54" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="726" y="386" font-size="12" font-weight="800" fill="#475569">EMBARQUE</text>
    <text x="726" y="407" font-size="17" font-weight="800" fill="#0f172a">Assento 18 registrado</text>
  </g>

  <g filter="url(#shadow)">
    <circle cx="606" cy="190" r="58" fill="#dc2626"/>
    <circle cx="606" cy="190" r="28" fill="#ffffff"/>
    <circle cx="606" cy="190" r="13" fill="#dc2626"/>
    <path d="M606 242 C606 242, 558 292, 558 190" fill="#dc2626"/>
  </g>
</svg>
`;

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await sharp(Buffer.from(svg))
    .flatten({ background: "#0f766e" })
    .png({ compressionLevel: 9 })
    .toFile(outFile);
  console.log(outFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
