/* -------------------------------------------------------------------------- */
/*                                 joiFactory                                 */
/* -------------------------------------------------------------------------- */
/*
 * Generic Joi validation factory for Mongoose schemas.
 *
 * Supported:
 * - String
 * - Number
 * - Boolean
 * - Date
 * - ObjectId
 * - Multi-language Maps
 * - Arrays
 * - Nested Objects
 * - Create / Update validation
 * - Query validation
 * - Bulk IDs validation
 */

import Joi from "joi";
import mongoose from "mongoose";
import { SUPPORTED_LANGUAGES } from "./languages.js";

const { ObjectId } = mongoose.Types;

/* -------------------------------------------------------------------------- */
/*                           MongoDB ObjectId Validator                       */
/* -------------------------------------------------------------------------- */

export const objectId = (allowNull = false) => {
  let schema = Joi.string()
    .trim()
    .hex()
    .length(24)
    .custom((value, helpers) => {
      if (!ObjectId.isValid(value)) {
        return helpers.error("any.invalid");
      }

      return value;
    })
    .messages({
      "string.hex": "ObjectId must be hexadecimal",
      "string.length": "ObjectId must contain 24 characters",
      "any.invalid": "Invalid ObjectId format",
    });

  if (allowNull) {
    schema = schema.allow(null);
  }

  return schema;
};

/* -------------------------------------------------------------------------- */
/*                          Multi Language Validator                          */
/* -------------------------------------------------------------------------- */

// Previously hardcoded to ["AR", "EN"], which rejected any other language
// key (e.g. "FR") on a Map-typed multilingual field even when the Mongoose
// schema itself allowed it — see utils/languages.js for the full story.
// Widening the default to the platform's full supported-language list is
// backward compatible: it only accepts more keys than before, it never
// rejects a payload that validated previously.
export const multiLang = (
  options = {},
  required = false,
  allowedLanguages = SUPPORTED_LANGUAGES,
) => {
  let valueSchema = Joi.string().trim();

  if (options.minlength) {
    valueSchema = valueSchema.min(options.minlength);
  }

  if (options.maxlength) {
    valueSchema = valueSchema.max(options.maxlength);
  }

  let schema = Joi.object(
    Object.fromEntries(
      allowedLanguages.map((lang) => [lang, valueSchema.optional()]),
    ),
  )
    .min(1)
    .unknown(false);

  if (required) {
    schema = schema.required();
  }

  return schema;
};

/* -------------------------------------------------------------------------- */
/*                        Array Validator Builder                             */
/* -------------------------------------------------------------------------- */

const buildArrayValidator = (field) => {
  const caster = field.caster;

  if (!caster) {
    return Joi.array();
  }

  switch (caster.instance) {
    case "String": {
      let validator = Joi.string().trim();

      if (caster.options?.enum) {
        validator = validator.valid(...caster.options.enum);
      }

      return Joi.array().items(validator);
    }

    case "Number":
      return Joi.array().items(Joi.number());

    case "Boolean":
      return Joi.array().items(Joi.boolean());

    case "ObjectId":
      return Joi.array().items(objectId());

    default:
      return Joi.array().items(Joi.any());
  }
};

/* -------------------------------------------------------------------------- */
/*                        Nested Object Builder                               */
/* -------------------------------------------------------------------------- */

const buildNestedSchema = (nestedObject, mode = "create") => {
  const fields = {};

  Object.entries(nestedObject).forEach(([key, value]) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !value.type
    ) {
      fields[key] = buildNestedSchema(value, mode);
    } else {
      fields[key] = Joi.any();
    }
  });

  return Joi.object(fields);
};

/* -------------------------------------------------------------------------- */
/*                         Single Field Validator                             */
/* -------------------------------------------------------------------------- */

const buildFieldValidator = (field, mode = "create") => {
  let validator;

  switch (field.instance) {
    /* ---------------------------- String ---------------------------- */

    case "String":
      validator = Joi.string().trim();

      if (field.options.enum) {
        validator = validator.valid(...field.options.enum);
      }

      if (field.options.minlength) {
        validator = validator.min(field.options.minlength);
      }

      if (field.options.maxlength) {
        validator = validator.max(field.options.maxlength);
      }

      if (field.options.match) {
        validator = validator.pattern(field.options.match);
      }

      break;

    /* ---------------------------- Number ---------------------------- */

    case "Number":
      validator = Joi.number();

      if (field.options.min !== undefined) {
        validator = validator.min(field.options.min);
      }

      if (field.options.max !== undefined) {
        validator = validator.max(field.options.max);
      }

      break;
    /* ---------------------------- Decimal128 ------------------------- */
    case "Decimal128":
      validator = Joi.number();

      if (field.options.min !== undefined) {
        validator = validator.min(field.options.min);
      }

      if (field.options.max !== undefined) {
        validator = validator.max(field.options.max);
      }

      break;

    /* ---------------------------- Boolean --------------------------- */

    case "Boolean":
      validator = Joi.boolean();
      break;

    /* ----------------------------- Date ----------------------------- */

    case "Date":
      validator = Joi.date();
      break;

    /* --------------------------- ObjectId --------------------------- */

    case "ObjectId":
      validator = objectId(field.options.default === null);
      break;

    /* ----------------------------- Map ------------------------------ */

    case "Map":
      validator = multiLang(
        field.$__schemaType?.options || {},
        field.options.required,
      );
      break;

    /* ----------------------------- Array ---------------------------- */

    case "Array":
      validator = buildArrayValidator(field);
      break;

    default:
      validator = Joi.any();
  }

  if (mode === "create" && field.options.required) {
    validator = validator.required();
  }

  if (mode === "update") {
    validator = validator.optional();
  }

  return validator;
};

/* -------------------------------------------------------------------------- */
/*                    Nested Plain-Object Path Reassembly                     */
/* -------------------------------------------------------------------------- */
/*
 * Mongoose flattens fields declared as plain nested objects (not
 * `new Schema(...)` subdocuments) into dotted paths in `schema.paths` —
 * e.g. `seo: { metaTitle: ..., ogImageUrl: ... }` shows up as
 * "seo.metaTitle", "seo.ogImageUrl", not a single "seo" entry. These used to
 * be dropped outright (`key.includes(".")` => skip), which meant every
 * nested-object field (Brand Settings' seo/socialMedia/modules/security,
 * Branch Settings' contact/services/reservation/policies, and any future
 * module's nested settings) was silently rejected by the generated schema's
 * `unknown(false)` the moment a client actually sent it.
 *
 * `groupNestedEntries` + `buildNestedObjectValidator` below reconstruct the
 * dotted paths back into a tree and turn each branch into a real nested
 * Joi.object(...) instead of dropping it, so any depth of plain-object
 * nesting works without a module having to hand-write a `.keys({...})`
 * override (see branch-settings.validation.ts's `operatingHours` override —
 * that one is still needed because it's a DocumentArray of a real Schema,
 * a different case this does not touch).
 *
 * Design choice: a nested wrapper key (e.g. "seo") is always added as
 * `.optional()`, regardless of whether a leaf inside it is `required` in
 * Mongoose. A `required` leaf is still enforced by `buildFieldValidator`,
 * but only once its parent object is actually present in the payload —
 * i.e. required-ness does not force the whole nested object to be sent.
 * This matches how optional sub-documents are conventionally validated and
 * avoids forcing every settings client to always send every nested block.
 */

const groupNestedEntries = (entries) => {
  const groups = new Map();

  entries.forEach(({ segments, field }) => {
    const [head, ...rest] = segments;

    if (!groups.has(head)) {
      groups.set(head, []);
    }

    groups.get(head).push({ segments: rest, field });
  });

  return groups;
};

const buildNestedObjectValidator = (entries, mode) => {
  const fields = {};

  groupNestedEntries(entries).forEach((children, key) => {
    if (children.length === 1 && children[0].segments.length === 0) {
      fields[key] = buildFieldValidator(children[0].field, mode);
      return;
    }

    fields[key] = buildNestedObjectValidator(children, mode).optional();
  });

  return Joi.object(fields).unknown(false);
};

/* -------------------------------------------------------------------------- */
/*                         Build Joi Schema                                   */
/* -------------------------------------------------------------------------- */

export const buildJoiSchema = (
  mongooseSchema,
  { mode = "create", exclude = [] } = {},
) => {
  const schemaFields = {};

  const excludedFields = [
    "_id",
    "__v",

    "createdAt",
    "updatedAt",

    "createdBy",
    "updatedBy",

    "deletedAt",
    "deletedBy",
    "isDeleted",

    ...exclude,
  ];

  // Nested dotted paths (see the block above) are collected here first and
  // reassembled into their parent's Joi object after the flat pass below.
  const nestedEntries = [];

  Object.entries(mongooseSchema.paths).forEach(([key, field]) => {
    if (excludedFields.includes(key)) {
      return;
    }

    if (key.includes(".")) {
      const [topLevelKey] = key.split(".");

      // Whole nested object explicitly excluded (e.g. `exclude: ["brand"]`
      // would also drop a hypothetical "brand.x" path) — same semantics as
      // the flat-field exclusion above.
      if (excludedFields.includes(topLevelKey)) {
        return;
      }

      nestedEntries.push({ segments: key.split("."), field });
      return;
    }

    schemaFields[key] = buildFieldValidator(field, mode);
  });

  groupNestedEntries(nestedEntries).forEach((children, key) => {
    schemaFields[key] = buildNestedObjectValidator(children, mode).optional();
  });

  let schema = Joi.object(schemaFields).unknown(false).prefs({
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (mode === "update") {
    schema = schema.min(1);
  }

  return schema;
};

/* -------------------------------------------------------------------------- */
/*                             Create Schema                                  */
/* -------------------------------------------------------------------------- */

export const createSchema = (mongooseSchema, options = {}) =>
  buildJoiSchema(mongooseSchema, {
    mode: "create",
    ...options,
  });

/* -------------------------------------------------------------------------- */
/*                             Update Schema                                  */
/* -------------------------------------------------------------------------- */

export const updateSchema = (mongooseSchema, options = {}) =>
  buildJoiSchema(mongooseSchema, {
    mode: "update",
    ...options,
  });

/* -------------------------------------------------------------------------- */
/*                           Route Params Schema                              */
/* -------------------------------------------------------------------------- */

export const paramsSchema = () =>
  Joi.object({
    id: objectId().required(),
  });

/* -------------------------------------------------------------------------- */
/*                             Bulk IDs Schema                                */
/* -------------------------------------------------------------------------- */

export const bulkIdsSchema = () =>
  Joi.object({
    ids: Joi.array().items(objectId()).min(1).required(),
  });

/* -------------------------------------------------------------------------- */
/*                              Query Schema                                  */
/* -------------------------------------------------------------------------- */

export const querySchema = (extra = {}) =>
  Joi.object({
    page: Joi.number().integer().min(1).default(1),

    limit: Joi.number().integer().min(1).max(100).default(10),

    search: Joi.string().trim().max(100).allow("").optional(),

    sort: Joi.string().trim().max(100).optional(),

    select: Joi.string().trim().max(200).optional(),

    includeDeleted: Joi.boolean().optional(),

    ...extra,
  }).unknown(false);
/* -------------------------------------------------------------------------- */
/*                           Bulk IDs Validation                              */
/* -------------------------------------------------------------------------- */
/*
 * Used for:
 * - bulkSoftDelete
 * - bulkRestore
 * - bulkHardDelete
 */

export const paramsIdsSchema = () =>
  Joi.object({
    ids: Joi.array().items(objectId()).min(1).required().messages({
      "array.base": "ids must be an array",
      "array.min": "At least one id is required",
      "any.required": "ids field is required",
    }),
  })
    .required()
    .unknown(false);
/* -------------------------------------------------------------------------- */
/*                                  Export                                    */
/* -------------------------------------------------------------------------- */

export default {
  objectId,
  multiLang,
  buildJoiSchema,
  createSchema,
  updateSchema,
  paramsSchema,
  bulkIdsSchema,
  querySchema,
  paramsIdsSchema,
};
