const mongoose = require("mongoose");

const { ObjectId } = mongoose.Types;

/**
 * Validate multilingual name & ensure uniqueness
 */
const ensureUniqueMultilangName = async ({
  Model,
  nameObj,
  allowedLangs,
  scope = {},
  excludeId = null,
  onlyActive = true,
}) => {
  // ---------- Basic validation ----------
  if (!Model) throw new Error("Model is required");
  if (!nameObj || typeof nameObj !== "object") {
    return { valid: false, error: "Multilingual name must be an object" };
  }
  if (!Array.isArray(allowedLangs) || allowedLangs.length === 0) {
    throw new Error("allowedLangs must be a non-empty array");
  }

  const normalizedAllowed = allowedLangs.map((l) => l.toUpperCase());

  // ---------- Language validation ----------
  for (const lang of Object.keys(nameObj)) {
    if (!normalizedAllowed.includes(lang.toUpperCase())) {
      return {
        valid: false,
        error: `Language '${lang}' is not enabled for this brand`,
      };
    }
  }

  // ---------- Uniqueness check ----------
  for (const lang of Object.keys(nameObj)) {
    const query = {
      ...scope,
      [`name.${lang}`]: nameObj[lang],
    };

    if (excludeId && ObjectId.isValid(excludeId)) {
      query._id = { $ne: excludeId };
    }

    if (onlyActive) {
      query.isActive = true;
    }

    const exists = await Model.exists(query);
    if (exists) {
      return {
        valid: false,
        duplicateLang: lang,
        error: `Name already exists for language '${lang}'`,
      };
    }
  }

  return { valid: true };
};

module.exports = ensureUniqueMultilangName;
