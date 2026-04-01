// ./utils/joiFactory.js

import Joi from "joi";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

/* =========================
   Helpers
========================= */

/**
 * Validate MongoDB ObjectId
 */
export const objectId = () =>
  Joi.string().custom((value, helpers) => {
    if (!ObjectId.isValid(value)) {
      return helpers.message("Invalid ObjectId format");
    }
    return value;
  });

/**
 * Multi-language validator (Map)
 * Supports dynamic value rules from mongoose schema
 */
export const multiLang = (options = {}, required = false) => {
  let valueValidator = Joi.string().trim();

  if (options.minlength)
    valueValidator = valueValidator.min(options.minlength);

  if (options.maxlength)
    valueValidator = valueValidator.max(options.maxlength);

  let schema = Joi.object()
    .pattern(
      Joi.string().valid("EN", "AR", "FR", "ES", "IT", "ZH", "JA", "RU"),
      valueValidator
    )
    .min(1);

  return required ? schema.required() : schema;
};

/* =========================
   Core Builder
========================= */

/**
 * Build Joi schema dynamically from Mongoose schema
 */
export const buildJoiSchema = (mongooseSchema, options = {}) => {
  const joiSchema = {};
  const paths = mongooseSchema.paths;

  const excludedFields = options.exclude || [
    "__v",
    "_id",
    "createdAt",
    "updatedAt",
  ];

  Object.keys(paths).forEach((key) => {
    if (excludedFields.includes(key)) return;
    if (key.includes(".")) return;

    const field = paths[key];
    let validator;

    /* =========================
       SWITCH BY TYPE
    ========================= */

    switch (field.instance) {
      case "String":
        validator = Joi.string().trim();

        if (field.options.minlength)
          validator = validator.min(field.options.minlength);

        if (field.options.maxlength)
          validator = validator.max(field.options.maxlength);

        if (field.options.enum)
          validator = validator.valid(...field.options.enum);

        if (field.options.match)
          validator = validator.pattern(field.options.match);

        if (field.options.required)
          validator = validator.required();

        break;

      case "Number":
        validator = Joi.number();

        if (field.options.min != null)
          validator = validator.min(field.options.min);

        if (field.options.max != null)
          validator = validator.max(field.options.max);

        if (field.options.required)
          validator = validator.required();

        break;

      case "Boolean":
        validator = Joi.boolean();
        if (field.options.required) validator = validator.required();
        break;

      case "Date":
        validator = Joi.date();
        if (field.options.required) validator = validator.required();
        break;

      case "ObjectId":
        validator = objectId();
        if (field.options.required) validator = validator.required();
        break;

      /* =========================
         MAP (🔥 مهم جدًا)
      ========================= */
      case "Map": {
        const mapOptions = field.$__schemaType?.options || {};
        validator = multiLang(mapOptions, field.options.required);
        break;
      }

      /* =========================
         ARRAY
      ========================= */
      case "Array":
        if (field.caster?.instance === "ObjectId") {
          validator = Joi.array().items(objectId());
        } else if (field.caster?.instance === "String") {
          validator = Joi.array().items(Joi.string());
        } else if (field.caster?.instance === "Number") {
          validator = Joi.array().items(Joi.number());
        } else {
          validator = Joi.array().items(Joi.any());
        }

        if (field.options.required) validator = validator.required();
        break;

      /* =========================
         SUB DOCUMENT
      ========================= */
      case "Embedded":
      case "Subdocument":
        validator = Joi.object(
          buildJoiSchema(field.schema, options)
        );
        if (field.options.required) validator = validator.required();
        break;

      /* =========================
         DEFAULT
      ========================= */
      default:
        validator = Joi.any();
        if (field.options.required) validator = validator.required();
    }

    joiSchema[key] = validator;
  });

  return Joi.object(joiSchema);
};

/* =========================
   Schema Generators
========================= */

/**
 * Create Schema (strict)
 */
export const createSchema = (mongooseSchema) => {
  return buildJoiSchema(mongooseSchema);
};

/**
 * Update Schema (all optional + required meta)
 */
export const updateSchema = (mongooseSchema, extraRequired = []) => {
  const schema = buildJoiSchema(mongooseSchema);

  const allowedFields = Object.keys(mongooseSchema.paths).filter(
    (key) =>
      !["_id", "__v", "createdAt", "updatedAt"].includes(key) &&
      !key.includes(".")
  );

  let updated = schema.fork(allowedFields, (field) => field.optional());

  const requiredFields = {
    _id: objectId().required(),
  };

  extraRequired.forEach((field) => {
    requiredFields[field] = objectId().required();
  });

  return updated.keys(requiredFields);
};

/**
 * Params Schema
 */
export const paramsSchema = () =>
  Joi.object({
    _id: objectId().required(),
  });

/**
 * Query Schema (generic)
 */
export const querySchema = () =>
  Joi.object({
    limit: Joi.number().min(1).max(100).optional(),
    skip: Joi.number().min(0).optional(),
    search: Joi.string().optional(),
    sortBy: Joi.string().optional(),
    order: Joi.string().valid("asc", "desc").optional(),
  });