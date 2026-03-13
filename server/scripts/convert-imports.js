import fs from "fs";
import path from "path";

// ➤ مجلد المشروع اللي عايز تحول فيه كل الملفات
const PROJECT_DIR = path.resolve("../../server"); // عدل لو محتاج

// ➤ دالة تجيب كل الملفات .js
function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsFiles(filePath));
    } else if (file.endsWith(".js")) {
      results.push(filePath);
    }
  });
  return results;
}

// ➤ دالة لتحويل محتوى كل ملف
function convertFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");

  // 1️⃣ تحويل require للمكتبات الخارجية
  content = content.replace(
    /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?/g,
    (match, varName, modulePath) => {
      // لو المسار نسبي
      if (modulePath.startsWith(".")) {
        if (!modulePath.endsWith(".js")) modulePath += ".js";
      }
      return `import ${varName} from "${modulePath}";`;
    }
  );

  // 2️⃣ تحويل destructuring require
  content = content.replace(
    /const\s+{([^}]+)}\s*=\s*require\(['"]([^'"]+)['"]\);?/g,
    (match, vars, modulePath) => {
      if (modulePath.startsWith(".")) {
        if (!modulePath.endsWith(".js")) modulePath += ".js";
      }
      return `import {${vars}} from "${modulePath}";`;
    }
  );

  // 3️⃣ تحويل module.exports
  content = content.replace(
    /module\.exports\s*=\s*({[\s\S]*});?/g,
    (match, exportsObj) => {
      return `export ${exportsObj};`;
    }
  );

  // 4️⃣ تحويل exports.default
  content = content.replace(
    /module\.exports\s*=\s*(\w+);?/g,
    (match, exportedVar) => {
      return `export default ${exportedVar};`;
    }
  );

  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`✅ Converted: ${filePath}`);
}

// ➤ تنفيذ التحويل على كل الملفات
const files = getAllJsFiles(PROJECT_DIR);
files.forEach(convertFile);

console.log("\n🎉 Conversion complete! لا تنسى إضافة 'type': 'module' في package.json");