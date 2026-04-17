// utils/joiFactory.js

import Joi from "joi";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

/* =========================
   Helpers
========================= */

export const objectId = (allowNull = false) => {
  let schema = Joi.string().custom((value, helpers) => {
    if (!ObjectId.isValid(value)) {
      return helpers.message("Invalid ObjectId format");
    }
    return value;
  });

  return allowNull ? schema.allow(null) : schema;
};

export const objectIdArray = () =>
  Joi.array().items(objectId()).min(1);

/* =========================
   MultiLang (Improved)
========================= */

export const multiLang = (options = {}, required = false) => {
  let valueValidator = Joi.string().trim();

  if (options.minlength)
    valueValidator = valueValidator.min(options.minlength);

  if (options.maxlength)
    valueValidator = valueValidator.max(options.maxlength);

  let schema = Joi.object()
    .pattern(
      Joi.string().length(2).uppercase(), // dynamic languages
      valueValidator
    )
    .min(1);

  return required ? schema.required() : schema;
};

/* =========================
   Core Builder
========================= */

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
        validator = objectId(field.options.default === null);
        if (field.options.required) validator = validator.required();
        break;

      case "Map": {
        const mapOptions = field.$__schemaType?.options || {};
        validator = multiLang(mapOptions, field.options.required);
        break;
      }

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

      case "Embedded":
      case "Subdocument":
        validator = Joi.object(
          buildJoiSchema(field.schema, options)
        );
        if (field.options.required) validator = validator.required();
        break;

      default:
        validator = Joi.any();
        if (field.options.required) validator = validator.required();
    }

    joiSchema[key] = validator;
  });

  return Joi.object(joiSchema).unknown(false);
};

/* =========================
   Schema Generators
========================= */

export const createSchema = (mongooseSchema) => {
  return buildJoiSchema(mongooseSchema);
};

export const updateSchema = (mongooseSchema, extraRequired = []) => {
  const schema = buildJoiSchema(mongooseSchema);

  const allowedFields = Object.keys(mongooseSchema.paths).filter(
    (key) =>
      !["_id", "__v", "createdAt", "updatedAt"].includes(key) &&
      !key.includes(".")
  );

  let updated = schema.fork(allowedFields, (field) =>
    field.optional()
  );

  const requiredFields = {
    id: objectId().required(),
  };

  extraRequired.forEach((field) => {
    requiredFields[field] = objectId().required();
  });

  return updated.min(1).keys(requiredFields);
};

export const paramsSchema = () =>
  Joi.object({
    id: objectId().required(),
  });

export const paramsIdsSchema = () =>
  Joi.object({
    ids: Joi.array().items(objectId()).min(1).required(),
  });

export const querySchema = () =>
  Joi.object({
    limit: Joi.number().min(1).max(100).default(10),
    skip: Joi.number().min(0).default(0),
    search: Joi.string().trim().min(1).max(100).optional(),
    sortBy: Joi.string().optional(),
    order: Joi.string().valid("asc", "desc").optional(),
  });