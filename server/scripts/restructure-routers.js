const fs = require("fs");
const path = require("path");

const controllersDir = path.join(__dirname, "..", "controllers");
const routersDir = path.join(__dirname, "..", "router");

if (!fs.existsSync(routersDir)) fs.mkdirSync(routersDir);

const readFunctionsFromController = (content) => {
  const functions = [];

  // CommonJS exports
  const matches = content.match(/(?:const|function)\s+(\w+)\s*=\s*async|\basync\s+function\s+(\w+)/g);
  if (matches) {
    matches.forEach((m) => {
      const name = m.match(/\w+/g).pop();
      functions.push(name);
    });
  }

  return [...new Set(functions)];
};

const detectUploads = (content) => {
  if (content.includes("req.file") || content.includes("req.files")) {
    return true;
  }
  return false;
};

const detectBrandBranch = (content) => {
  return content.includes("req.brand") || content.includes("req.branch");
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

fs.readdirSync(controllersDir).forEach((moduleName) => {
  const modulePath = path.join(controllersDir, moduleName);
  if (!fs.statSync(modulePath).isDirectory()) return;

  const routerModuleDir = path.join(routersDir, moduleName);
  ensureDir(routerModuleDir);

  fs.readdirSync(modulePath).forEach((file) => {
    if (!file.endsWith(".controller.js")) return;

    const controllerPath = path.join(modulePath, file);
    const controllerContent = fs.readFileSync(controllerPath, "utf8");

    const functions = readFunctionsFromController(controllerContent);
    if (!functions.length) return;

    const hasUpload = detectUploads(controllerContent);
    const needsBrand = detectBrandBranch(controllerContent);

    const baseName = file.replace(".controller.js", "");
    const routerFile = path.join(routerModuleDir, `${baseName}.router.js`);

    if (fs.existsSync(routerFile)) {
      console.log(`⚠️ Skip existing router: ${routerFile}`);
      return;
    }

    let multerBlock = "";
    let uploadMiddleware = "";

    if (hasUpload) {
      multerBlock = `
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "${baseName}");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, \`\${Date.now()}-\${Math.random().toString(36).slice(2)}\${ext}\`);
  },
});

const upload = multer({ storage });
`;
      uploadMiddleware = "upload.any(), ";
    }

    let middlewareImports = `const { authenticateToken } = require("../../middlewares/authenticate");\n`;
    let middlewareUsage = "authenticateToken";

    if (needsBrand) {
      middlewareImports += `const { verifyBrandAndBranch } = require("../../middlewares/verifyBrandAndBranch");\n`;
      middlewareUsage += ", verifyBrandAndBranch";
    }

    let routes = "";

    functions.forEach((fn) => {
      if (fn.startsWith("create")) {
        routes += `
router.route("/")
  .post(${middlewareUsage}, ${uploadMiddleware}${fn});
`;
      }

      if (fn.startsWith("getAll")) {
        routes += `
router.route("/")
  .get(${middlewareUsage}, ${fn});
`;
      }

      if (fn.startsWith("get") && !fn.startsWith("getAll")) {
        routes += `
router.route("/:id")
  .get(${middlewareUsage}, ${fn});
`;
      }

      if (fn.startsWith("update")) {
        routes += `
router.route("/:id")
  .put(${middlewareUsage}, ${uploadMiddleware}${fn});
`;
      }

      if (fn.startsWith("softDelete")) {
        routes += `
router.route("/:id/soft-delete")
  .patch(${middlewareUsage}, ${fn});
`;
      }

      if (fn.startsWith("restore")) {
        routes += `
router.route("/:id/restore")
  .patch(${middlewareUsage}, ${fn});
`;
      }

      if (fn === "delete" || fn.startsWith("delete")) {
        routes += `
router.route("/:id")
  .delete(${middlewareUsage}, ${fn});
`;
      }
    });

    const routerContent = `
const express = require("express");
const router = express.Router();

${multerBlock}

const {
  ${functions.join(",\n  ")}
} = require("../../controllers/${moduleName}/${baseName}.controller");

${middlewareImports}

${routes}

module.exports = router;
`;

    fs.writeFileSync(routerFile, routerContent.trim(), "utf8");
    console.log(`✅ Generated router: ${routerFile}`);
  });
});

console.log("🎉 Smart router generation completed!");
