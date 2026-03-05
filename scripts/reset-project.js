const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function safeRm(p) {
  try {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  } catch (e) {
    console.error("Failed to remove:", p, e.message);
  }
}

const root = path.join(__dirname, "..");

console.log("🧹 Resetting project:", root);

// common caches
safeRm(path.join(root, ".expo"));
safeRm(path.join(root, ".turbo"));
safeRm(path.join(root, "node_modules"));
safeRm(path.join(root, "package-lock.json"));

// metro cache (sometimes under %TEMP%, but this still helps)
console.log("✅ Deleted: .expo/.turbo/node_modules/package-lock.json");

console.log("📦 Re-installing deps...");
execSync("npm install", { cwd: root, stdio: "inherit" });

console.log("🚀 Done. Now run: npm start");