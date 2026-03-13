const fs = require("fs");
const path = require("path");

const rootDir = "./"; // project root

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  const importRegex =
    /import\s+([a-zA-Z0-9_]+)\s+from\s+["'](.+?)["'];?/g;

  const updatedContent = content.replace(
    importRegex,
    'const $1 = require("$2");'
  );

  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent);
    console.log("Updated:", filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      if (file === "node_modules") continue;
      walk(fullPath);
    } else if (file.endsWith(".js")) {
      processFile(fullPath);
    }
  }
}

walk(rootDir);

console.log("Conversion complete.");