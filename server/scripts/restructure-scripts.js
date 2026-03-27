import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// paths
const modelsDir = path.join(__dirname, "../models");
const servicesDir = path.join(__dirname, "../services");
const validationsDir = path.join(__dirname, "../validations");

// main function
function generateStructure(dir, base = "") {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      generateStructure(fullPath, path.join(base, file));
    }

    // only model files
    else if (file.endsWith(".model.js")) {
      const modelName = file.replace(".model.js", "");
      const className = capitalize(modelName);

      // ----------- PATHS -----------
      const serviceFolder = path.join(servicesDir, base);
      const validationFolder = path.join(validationsDir, base);

      const serviceFile = path.join(serviceFolder, `${modelName}.service.js`);
      const validationFile = path.join(
        validationFolder,
        `${modelName}.validation.js`,
      );

      // fix model import path
      const modelPath = base
        ? `../../models/${base}/${modelName}.model.js`
        : `../../models/${modelName}.model.js`;

      // ----------- CREATE FOLDERS -----------
      if (!fs.existsSync(serviceFolder)) {
        fs.mkdirSync(serviceFolder, { recursive: true });
      }

      if (!fs.existsSync(validationFolder)) {
        fs.mkdirSync(validationFolder, { recursive: true });
      }

      // ----------- SERVICE TEMPLATE -----------
      const serviceTemplate = `
import ${modelName}Model from "${modelPath}";

class ${className}Service {

  async create(data) {
    return await ${modelName}Model.create(data);
  }

  async findAll(filter = {}) {
    return await ${modelName}Model.find(filter);
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

export default new ${className}Service();
`;

      // ----------- VALIDATION TEMPLATE (Joi) -----------
      const validationTemplate = `
import Joi from "joi";

export const create${className}Schema = Joi.object({
  // TODO: define fields based on model
});

export const update${className}Schema = Joi.object({
  // TODO: define update fields
});
`;

      // ----------- WRITE FILES -----------
      fs.writeFileSync(serviceFile, serviceTemplate.trim());
      fs.writeFileSync(validationFile, validationTemplate.trim());

      console.log("✅ Created:");
      console.log("Service:", serviceFile);
      console.log("Validation:", validationFile);
      console.log("----------------------------------");
    }
  });
}

// helper
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// run
generateStructure(modelsDir);
