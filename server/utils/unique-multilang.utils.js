import mongoose from "mongoose";
import BrandModel from "../models/core/brand.model.js";
const { ObjectId } = mongoose.Types;

const normalize = (val) => val.trim().toLowerCase();

const ensureUniqueMultilangName = async ({
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

  if (!Array.isArray(allowedLangs) || allowedLangs.length === 0) {
    throw new Error("allowedLangs must be a non-empty array");
  }

  const allowed = allowedLangs.map((l) => l.toUpperCase());
  const inputLangs = Object.keys(nameObj).map((l) => l.toUpperCase());

  // Missing
  if (requireAllLanguages) {
    for (const lang of allowed) {
      if (!inputLangs.includes(lang)) {
        return {
          valid: false,
          error: `${fieldName}.${lang} is required`,
        };
      }
    }
  }

  // Extra
  for (const lang of inputLangs) {
    if (!allowed.includes(lang)) {
      return {
        valid: false,
        error: `${fieldName}.${lang} is not allowed`,
      };
    }
  }

  // Empty
  for (const key of Object.keys(nameObj)) {
    const value = nameObj[key];
    if (!value || !value.trim()) {
      return {
        valid: false,
        error: `${fieldName}.${key} cannot be empty`,
      };
    }
  }

  // Duplicate داخلي
  const normalizedValues = Object.values(nameObj).map(normalize);
  if (new Set(normalizedValues).size !== normalizedValues.length) {
    return {
      valid: false,
      error: `${fieldName} must be unique across languages`,
    };
  }

  // DB check
  const orConditions = Object.entries(nameObj).map(([lang, value]) => ({
    [`name.${lang}`]: new RegExp(`^${value.trim()}$`, "i"),
  }));

  const query = {
    ...scope,
    $or: orConditions,
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
      error: `${fieldName} already exists`,
    };
  }

  return { valid: true };
};

export default ensureUniqueMultilangName;