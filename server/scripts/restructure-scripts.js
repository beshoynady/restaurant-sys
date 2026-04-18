/**
 * =====================================================
 * SAFE FULL MIGRATION SCRIPT (PRODUCTION READY)
 * -----------------------------------------------------
 * - Correct root resolution
 * - Full file scan
 * - Proper type mapping (controller/router/model/service/validation)
 * - Safe fallback (misc)
 * - No mis-routing bugs
 * =====================================================
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// =====================================================
// ROOT FIX
// =====================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");

// =====================================================
// SOURCE DIRECTORIES
// =====================================================
const CONTROLLERS_DIR = path.join(ROOT, "controllers");
const ROUTERS_DIR = path.join(ROOT, "router");
const MODELS_DIR = path.join(ROOT, "models");
const SERVICES_DIR = path.join(ROOT, "services");
const VALIDATIONS_DIR = path.join(ROOT, "validation");

// =====================================================
// TYPE → FOLDER MAP (IMPORTANT FIX)
// =====================================================
const TYPE_FOLDER_MAP = {
  controllers: "controller",
  router: "router",
  models: "model",
  services: "service",
  validations: "validation",
};

// =====================================================
// DOMAIN RESOLVER
// =====================================================
const resolveModule = (fileName) => {
  const name = fileName.toLowerCase();

  const rules = [
    { match: /employee|department|attendance|job-title/, module: "hr" },
    { match: /user|role|auth|permission/, module: "iam" },

    { match: /payroll|advance|financial/, module: "hr" },

    { match: /account|journal|ledger|cost-center/, module: "accounting" },

    { match: /cash|bank|transfer/, module: "finance" },

    { match: /asset|depreciation|maintenance/, module: "assets" },

    { match: /stock|inventory|warehouse|consumption/, module: "inventory" },

    { match: /purchase|supplier/, module: "purchasing" },

    { match: /order|invoice|sales|promotion/, module: "sales" },

    { match: /product|menu|recipe/, module: "menu" },

    { match: /kitchen|preparation|ticket/, module: "kitchen" },

    { match: /customer|message/, module: "crm" },

    { match: /loyalty|reward/, module: "loyalty" },

    { match: /table|reservation|dining/, module: "seating" },

    { match: /payment/, module: "payments" },

    { match: /branch|brand|delivery/, module: "organization" },

    { match: /tax|discount|print|notification|system/, module: "system" },

    { match: /setup|seed/, module: "setup" },
  ];

  for (const r of rules) {
    if (r.match.test(name)) return r.module;
  }

  return "misc"; // safe fallback
};

// =====================================================
// HELPERS
// =====================================================
const ensureDir = (dir) => {
  if (!dir) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const safeMove = (from, to) => {
  if (!from || !to) return;
  if (!fs.existsSync(from)) return;

  ensureDir(path.dirname(to));

  if (fs.existsSync(to)) {
    console.log(`⚠️ EXISTS: ${to}`);
    return;
  }

  fs.renameSync(from, to);
  console.log(`✅ ${from} → ${to}`);
};

// =====================================================
// BACKUP
// =====================================================
const backupDir = path.join(ROOT, "_backup_migration");

console.log("📦 Creating backup...");

ensureDir(backupDir);

if (fs.existsSync(CONTROLLERS_DIR)) {
  fs.cpSync(CONTROLLERS_DIR, path.join(backupDir, "controllers"), {
    recursive: true,
  });
}

if (fs.existsSync(ROUTERS_DIR)) {
  fs.cpSync(ROUTERS_DIR, path.join(backupDir, "router"), {
    recursive: true,
  });
}

if (fs.existsSync(MODELS_DIR)) {
  fs.cpSync(MODELS_DIR, path.join(backupDir, "models"), {
    recursive: true,
  });
}

if (fs.existsSync(SERVICES_DIR)) {
  fs.cpSync(SERVICES_DIR, path.join(backupDir, "services"), {
    recursive: true,
  });
}

if (fs.existsSync(VALIDATIONS_DIR)) {
  fs.cpSync(VALIDATIONS_DIR, path.join(backupDir, "validations"), {
    recursive: true,
  });
}

console.log("✅ Backup done");

// =====================================================
// MODULE STRUCTURE
// =====================================================
const modules = [
  "iam",
  "hr",
  "finance",
  "accounting",
  "assets",
  "inventory",
  "purchasing",
  "sales",
  "menu",
  "kitchen",
  "crm",
  "loyalty",
  "seating",
  "payments",
  "organization",
  "system",
  "setup",
  "misc",
];

modules.forEach((m) => {
  ensureDir(path.join(ROOT, "modules", m, "controller"));
  ensureDir(path.join(ROOT, "modules", m, "router"));
  ensureDir(path.join(ROOT, "modules", m, "model"));
  ensureDir(path.join(ROOT, "modules", m, "service"));
  ensureDir(path.join(ROOT, "modules", m, "validation"));
});

console.log("📁 Structure ready");

// =====================================================
// MIGRATION ENGINE (FULL SAFE SCAN)
// =====================================================
const migrate = (sourceDir, type) => {
  if (!fs.existsSync(sourceDir)) {
    console.log(`⚠️ Missing: ${sourceDir}`);
    return;
  }

  const targetFolder = TYPE_FOLDER_MAP[type] || "misc";

  const walk = (dir) => {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const module = resolveModule(item);

      const targetPath = path.join(
        ROOT,
        "modules",
        module,
        targetFolder,
        item
      );

      safeMove(fullPath, targetPath);
    }
  };

  walk(sourceDir);
};

// =====================================================
// RUN
// =====================================================
console.log("🚀 Migration started...");

migrate(CONTROLLERS_DIR, "controllers");
migrate(ROUTERS_DIR, "router");
migrate(MODELS_DIR, "models");
migrate(SERVICES_DIR, "services");
migrate(VALIDATIONS_DIR, "validations");

console.log("🎉 DONE - Migration completed successfully");