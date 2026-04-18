// server/scripts/restructure.js

import fs from "fs";
import path from "path";

// ===== CONFIG =====
const ROOT = path.resolve("server");

const SOURCE_FOLDERS = {
  controllers: "controllers",
  services: "services",
  models: "models",
  router: "router",
};

const TARGET = path.join(ROOT, "modules");

// Map folder → module
const DOMAIN_MAP = {
  accounting: "accounting",
  assets: "accounting",
  cash: "finance",
  core: "core",
  customers: "customers",
  employees: "hr",
  expenses: "finance",
  inventory: "inventory",
  kitchen: "kitchen",
  loyalty: "loyalty",
  menu: "sales",
  "payment-provider": "payments",
  payments: "payments",
  production: "production",
  purchasing: "purchasing",
  sales: "sales",
  seating: "seating",
  system: "settings/system",
  auth: "auth",
  setup: "setup",
};

// ===== HELPERS =====

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function moveFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.renameSync(src, dest);
  console.log(`✅ Moved: ${src} → ${dest}`);
}

function getFeatureName(fileName) {
  return fileName.replace(/\.(controller|service|model|router)\.js$/, "");
}

// ===== CORE LOGIC =====

function processFolder(type, folderPath) {
  const fullPath = path.join(ROOT, folderPath);

  if (!fs.existsSync(fullPath)) return;

  const domains = fs.readdirSync(fullPath);

  domains.forEach((domain) => {
    const domainPath = path.join(fullPath, domain);
    if (!fs.lstatSync(domainPath).isDirectory()) return;

    const mappedDomain = DOMAIN_MAP[domain];
    if (!mappedDomain) {
      console.warn(`⚠️ No mapping for domain: ${domain}`);
      return;
    }

    const files = fs.readdirSync(domainPath);

    files.forEach((file) => {
      const src = path.join(domainPath, file);

      if (!fs.lstatSync(src).isFile()) return;

      const feature = getFeatureName(file);

      const targetPath = path.join(
        TARGET,
        mappedDomain,
        feature,
        `${feature}.${type}.js`
      );

      moveFile(src, targetPath);
    });
  });
}

// ===== SETTINGS STRUCTURE =====

function createSettingsStructure() {
  const settingsBase = path.join(TARGET, "settings");

  const structure = {
    core: ["brand-settings", "branch-settings"],
    inventory: ["inventory-settings"],
    sales: ["order-settings", "invoice-settings", "promotion-settings"],
    hr: ["attendance-settings", "payroll-settings"],
    kitchen: ["kitchen-settings"],
    loyalty: ["loyalty-settings"],
    payments: ["payment-settings"],
    system: [
      "tax-settings",
      "discount-settings",
      "service-charge-settings",
      "notification-settings",
    ],
  };

  Object.entries(structure).forEach(([domain, features]) => {
    features.forEach((feature) => {
      const dir = path.join(settingsBase, domain, feature);
      ensureDir(dir);

      // create empty placeholder files
      ["model", "service", "controller", "router"].forEach((type) => {
        const file = path.join(dir, `${feature}.${type}.js`);
        if (!fs.existsSync(file)) {
          fs.writeFileSync(
            file,
            `// ${feature} ${type} - placeholder\n`
          );
        }
      });
    });
  });

  console.log("⚙️ Settings structure created");
}

// ===== RUN =====

function run() {
  console.log("🚀 Starting restructuring...\n");

  Object.entries(SOURCE_FOLDERS).forEach(([type, folder]) => {
    processFolder(type, folder);
  });

  createSettingsStructure();

  console.log("\n🎉 Done restructuring!");
}

run();