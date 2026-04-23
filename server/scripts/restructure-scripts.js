import fs from "fs";
import path from "path";

const ROOT = process.cwd();

/**
 * ================================
 * CONFIG (عدل هنا لو حبيت)
 * ================================
 */
const SOURCE_CANDIDATES = [
  path.join(ROOT, "server/modules"),
  path.join(ROOT, "server"),
  path.join(ROOT, "server/_backup_migration"),
];

const TARGET_PATH = path.join(ROOT, "server/new-modules");

const LAYERS = ["controller", "service", "model", "router", "validation"];

/**
 * ================================
 * HELPERS
 * ================================
 */

const resolveSourcePath = () => {
  for (const p of SOURCE_CANDIDATES) {
    if (fs.existsSync(p)) {
      console.log("📂 Using source:", p);
      return p;
    }
  }
  throw new Error("❌ No valid source path found");
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const detectType = (file) => {
  if (file.includes(".controller")) return "controller";
  if (file.includes(".service")) return "service";
  if (file.includes(".model")) return "model";
  if (file.includes(".router")) return "router";
  if (file.includes(".validation")) return "validation";
  return null;
};

const getEntity = (file) => {
  return file.split(".")[0]; // account.service.js → account
};

const moveFile = (src, dest) => {
  ensureDir(path.dirname(dest));

  if (fs.existsSync(dest)) {
    console.log("⏭️ Skipped (exists):", dest);
    return;
  }

  fs.renameSync(src, dest);
  console.log("✅ Moved:", src, "→", dest);
};

/**
 * ================================
 * CORE LOGIC
 * ================================
 */

const processModule = (modulePath, moduleName) => {
  console.log(`\n📦 Module: ${moduleName}`);

  LAYERS.forEach((layer) => {
    const layerPath = path.join(modulePath, layer);

    if (!fs.existsSync(layerPath)) return;

    const files = fs.readdirSync(layerPath);

    files.forEach((file) => {
      const type = detectType(file);
      if (!type) return;

      const entity = getEntity(file);

      const src = path.join(layerPath, file);

      const dest = path.join(
        TARGET_PATH,
        moduleName,
        entity,
        file
      );

      moveFile(src, dest);
    });
  });
};

/**
 * ================================
 * RUN
 * ================================
 */

const run = () => {
  console.log("🚀 Starting Module Restructure...\n");

  const SOURCE_PATH = resolveSourcePath();

  ensureDir(TARGET_PATH);

  const modules = fs
    .readdirSync(SOURCE_PATH)
    .filter((dir) =>
      fs.statSync(path.join(SOURCE_PATH, dir)).isDirectory()
    );

  if (modules.length === 0) {
    console.log("⚠️ No modules found!");
    return;
  }

  modules.forEach((moduleName) => {
    const modulePath = path.join(SOURCE_PATH, moduleName);

    processModule(modulePath, moduleName);
  });

  console.log("\n🎉 Restructure Completed Successfully");
};

run();