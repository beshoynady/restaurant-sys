import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

const normalize = (val) => val.trim().toLowerCase();

const ensureUniqueMultiLangName = async ({
  Model,
  nameObj,
  allowedLangs,
  scope = {},
  excludeId = null,
  onlyActive = true,
  requireAllLanguages = true,
  fieldName = "name",
}) => {
  if (!Model) throw new Error("Model is required");

  if (!nameObj || typeof nameObj !== "object") {
    return { valid: false, error: `${fieldName} must be an object` };
  }

  const allowed = allowedLangs.map((l) => l.toUpperCase());
  const inputLangs = Object.keys(nameObj).map((l) => l.toUpperCase());

  // validate missing langs
  if (requireAllLanguages) {
    for (const lang of allowed) {
      if (!inputLangs.includes(lang)) {
        return { valid: false, error: `${fieldName}.${lang} is required` };
      }
    }
  }

  // validate extra langs
  for (const lang of inputLangs) {
    if (!allowed.includes(lang)) {
      return { valid: false, error: `${fieldName}.${lang} not allowed` };
    }
  }

  // empty check
  for (const key of Object.keys(nameObj)) {
    if (!nameObj[key]?.trim()) {
      return { valid: false, error: `${fieldName}.${key} cannot be empty` };
    }
  }

  // duplicate inside object
  const values = Object.values(nameObj).map(normalize);
  if (new Set(values).size !== values.length) {
    return {
      valid: false,
      error: `${fieldName} must be unique across languages`,
    };
  }

  // DB check
  const or = Object.entries(nameObj).map(([lang, val]) => ({
    [`name.${lang}`]: new RegExp(`^${val.trim()}$`, "i"),
  }));

  const query = {
    ...scope,
    $or: or,
  };

  if (excludeId && ObjectId.isValid(excludeId)) {
    query._id = { $ne: excludeId };
  }

  if (onlyActive) query.isActive = true;

  const exists = await Model.exists(query);

  if (exists) {
    return { valid: false, error: `${fieldName} already exists` };
  }

  return { valid: true };
};

export default ensureUniqueMultiLangName;
