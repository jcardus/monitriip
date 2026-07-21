const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const outDir = path.join(__dirname, "phone-screenshots");
const sourceDir = path.join(__dirname, "..", "apple", "upload");

const screenshots = [
  {
    source: "iphone-01-viagem-ativa.png",
    output: "phone-01-viagem-ativa.png"
  },
  {
    source: "iphone-02-evidencias.png",
    output: "phone-02-evidencias.png"
  }
];

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  for (const screenshot of screenshots) {
    const input = path.join(sourceDir, screenshot.source);
    const output = path.join(outDir, screenshot.output);

    await sharp(input)
      .resize({ width: 1080 })
      .extract({ left: 0, top: 0, width: 1080, height: 1920 })
      .flatten({ background: "#f8fafc" })
      .png({ compressionLevel: 9 })
      .toFile(output);

    console.log(output);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
