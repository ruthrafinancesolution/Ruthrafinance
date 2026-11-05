import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, ".firebase", "emulator-data");
fs.mkdirSync(dataDir, { recursive: true });

const hasExport = fs.existsSync(path.join(dataDir, "firebase-export-metadata.json"));
const args = [
  "firebase",
  "emulators:start",
  "--project",
  "demo-ruthra-local",
  "--only",
  "auth,firestore,storage,functions",
  `--export-on-exit=${dataDir}`,
];

if (hasExport) {
  args.push(`--import=${dataDir}`);
}

console.log("Starting local Firebase emulators only. This does not deploy or contact production data.");
console.log(hasExport ? `Importing saved local data from ${dataDir}` : "No saved local data yet — starting empty.");

function quoteArg(arg) {
  if (!/[\s"]/.test(arg)) return arg;
  return `"${String(arg).replace(/"/g, '\\"')}"`;
}

const command = ["npx", ...args].map(quoteArg).join(" ");
const child = spawn(command, {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
