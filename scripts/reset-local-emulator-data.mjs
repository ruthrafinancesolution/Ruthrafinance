import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const firebaseDir = path.resolve(root, ".firebase");
const dataDir = path.resolve(firebaseDir, "emulator-data");

if (dataDir !== path.join(firebaseDir, "emulator-data")) {
  console.error("Refusing to delete a path outside the local emulator data folder.");
  process.exit(1);
}

fs.rmSync(dataDir, { recursive: true, force: true });
console.log(`Removed local emulator data at ${dataDir}`);
console.log("Production Firebase was not contacted and no live records were changed.");
console.log("Stop the emulator if it is still running, then start it again with: npm run emulators");
