const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const outDir = __dirname;
const outFile = path.join(outDir, "play-store-icon.png");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="64" y1="32" x2="448" y2="500" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0f766e"/>
      <stop offset="0.52" stop-color="#0b5f76"/>
      <stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="road" x1="156" y1="350" x2="356" y2="350" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#f8fafc" stop-opacity="0.92"/>
      <stop offset="1" stop-color="#d1fae5" stop-opacity="0.92"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#06101f" flood-opacity="0.24"/>
    </filter>
  </defs>

  <rect width="512" height="512" fill="url(#bg)"/>
  <path d="M76 372 C152 326, 176 266, 252 252 C326 238, 360 184, 436 136" fill="none" stroke="#99f6e4" stroke-width="20" stroke-linecap="round" opacity="0.28"/>
  <path d="M80 400 C154 346, 184 292, 254 278 C330 262, 370 202, 438 156" fill="none" stroke="#ecfeff" stroke-width="8" stroke-linecap="round" stroke-dasharray="20 24" opacity="0.86"/>

  <g filter="url(#softShadow)">
    <rect x="118" y="142" width="276" height="228" rx="42" fill="#f8fafc"/>
    <rect x="142" y="176" width="228" height="86" rx="18" fill="#0f172a"/>
    <rect x="160" y="195" width="84" height="48" rx="10" fill="#38bdf8" opacity="0.9"/>
    <rect x="268" y="195" width="84" height="48" rx="10" fill="#38bdf8" opacity="0.9"/>
    <rect x="156" y="284" width="200" height="42" rx="21" fill="#0f766e"/>
    <circle cx="176" cy="352" r="24" fill="#0f172a"/>
    <circle cx="336" cy="352" r="24" fill="#0f172a"/>
    <circle cx="176" cy="352" r="10" fill="#e2e8f0"/>
    <circle cx="336" cy="352" r="10" fill="#e2e8f0"/>
  </g>

  <g filter="url(#softShadow)">
    <path d="M374 76 C326 76, 286 115, 286 164 C286 225, 374 318, 374 318 C374 318, 462 225, 462 164 C462 115, 422 76, 374 76 Z" fill="#dc2626"/>
    <circle cx="374" cy="164" r="39" fill="#ffffff"/>
    <circle cx="374" cy="164" r="21" fill="#dc2626"/>
  </g>

  <path d="M124 416 H388" stroke="url(#road)" stroke-width="24" stroke-linecap="round" opacity="0.9"/>
  <path d="M198 416 H226 M286 416 H314" stroke="#0f172a" stroke-width="8" stroke-linecap="round" opacity="0.45"/>
</svg>
`;

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await sharp(Buffer.from(svg))
    .ensureAlpha(1)
    .png({ compressionLevel: 9 })
    .toFile(outFile);
  console.log(outFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
