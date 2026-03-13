import fs from "fs";
import path from "path";

const modelsDir = path.join(__dirname, "../../models");
const servicesDir = path.join(__dirname, "../validators");

function createServiceStructure(dir, base = "") {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      createServiceStructure(fullPath, path.join(base, file));
    } else if (file.endsWith(".model.js")) {
      const modelName = file.replace(".model.js", "");
      const serviceFolder = path.join(servicesDir, base);
      const serviceFile = path.join(serviceFolder, `${modelName}.validator.js`);

      if (!fs.existsSync(serviceFolder)) {
        fs.mkdirSync(serviceFolder, { recursive: true });
      }

      const serviceTemplate = `
const ${modelName}Model = require("../../models/${base}/${modelName}.model");

class ${capitalize(modelName)}Service {

  async create(data) {
    return await ${modelName}Model.create(data);
  }

  async findAll() {
    return await ${modelName}Model.find();
  }

  async findById(id) {
    return await ${modelName}Model.findById(id);
  }

  async update(id, data) {
    return await ${modelName}Model.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await ${modelName}Model.findByIdAndDelete(id);
  }

}

export new ${capitalize(modelName)}Service();
`;

      fs.writeFileSync(serviceFile, serviceTemplate.trim());
      console.log("Created:", serviceFile);
    }
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

createServiceStructure(modelsDir);