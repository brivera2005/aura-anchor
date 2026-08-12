/**
 * Generates Capacitor resource PNGs from the Next.js app SVG icon.
 * Run from mobile/: npm run icons
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(mobileRoot, "..");
const svgPath = path.join(projectRoot, "public", "icons", "icon.svg");
const resourcesDir = path.join(mobileRoot, "resources");

async function main() {
  await mkdir(resourcesDir, { recursive: true });
  const svg = await readFile(svgPath);

  await sharp(svg).resize(1024, 1024).png().toFile(path.join(resourcesDir, "icon.png"));

  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: { r: 250, g: 248, b: 246, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(svg).resize(900, 900).png().toBuffer(),
        gravity: "center",
      },
    ])
    .png()
    .toFile(path.join(resourcesDir, "splash.png"));

  const publicIcons = path.join(projectRoot, "public", "icons");
  await mkdir(publicIcons, { recursive: true });
  for (const size of [192, 512]) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(publicIcons, `icon-${size}.png`));
  }

  console.log("Generated mobile/resources/icon.png, splash.png, and public/icons/icon-192/512.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
