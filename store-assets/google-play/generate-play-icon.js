const path = require("node:path");
const sharp = require("sharp");

const appIcon = path.resolve(__dirname, "../../assets/icon.png");
const outFile = path.join(__dirname, "play-store-icon.png");

async function main() {
  // Keep the Play Store artwork identical to the icon embedded in the app.
  // Independent artwork here can trigger Google Play's listing-mismatch policy.
  await sharp(appIcon)
    .resize(512, 512, { fit: "fill" })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(outFile);

  console.log(outFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
