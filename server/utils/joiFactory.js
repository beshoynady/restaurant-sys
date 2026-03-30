// server/validation/joiFactory.js
import Joi from "joi";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

/* =========================
   Helpers
========================= */

// ObjectId validator
export const objectId = () =>
  Joi.string().custom((value, helpers) => {
    if (!ObjectId.isValid(value)) {
      return helpers.message("Invalid ObjectId format");
    }
    return value;
  }, "ObjectId Validation");

// Multi-language map validator
export const multiLang = () =>
  Joi.object().pattern(
    Joi.string().max(2).valid("EN", "AR", "FR", "ES", "IT", "ZH", "JA", "RU"),
    Joi.string().min(2).max(100)
  );

/* =========================
   Factory Function
   Build Joi schema from Mongoose schema
========================= */
export const buildJoiSchema = (mongooseSchema) => {
  const joiSchema = {};

  const paths = mongooseSchema.paths;

  Object.keys(paths).forEach((key) => {
    const field = paths[key];
    let validator;

    switch (field.instance) {
      case "String":
        validator = Joi.string().trim();
        if (field.options.maxlength) validator = validator.max(field.options.maxlength);
        if (field.options.minlength) validator = validator.min(field.options.minlength);
        if (field.options.enum) validator = validator.valid(...field.options.enum);
        if (field.options.required) validator = validator.required();
        break;

      case "Number":
        validator = Joi.number();
        if (field.options.min != null) validator = validator.min(field.options.min);
        if (field.options.max != null) validator = validator.max(field.options.max);
        if (field.options.required) validator = validator.required();
        break;

      case "Boolean":
        validator = Joi.boolean();
        if (field.options.required) validator = validator.required();
        if (field.options.enum && Array.isArray(field.options.enum)) {
          validator = validator.valid(...field.options.enum);
        }
        break;

      case "Date":
        validator = Joi.date();
        if (field.options.required) validator = validator.required();
        break;

      case "ObjectID":
      case "ObjectId":
        validator = objectId();
        if (field.options.required) validator = validator.required();
        break;

      case "Map":
        validator = multiLang();
        if (field.options.required) validator = validator.required();
        break;

      case "Array":
        if (field.caster && field.caster.instance) {
          // Array of subdocuments or ObjectIds
          if (["ObjectID", "ObjectId"].includes(field.caster.instance)) {
            validator = Joi.array().items(objectId());
          } else if (field.caster.instance === "Embedded") {
            validator = Joi.array().items(buildJoiSchema(field.caster.schema));
          } else {
            validator = Joi.array().items(Joi.any());
          }
        } else {
          validator = Joi.array();
        }
        if (field.options.required) validator = validator.required();
        break;

      case "Embedded":
        validator = Joi.object(buildJoiSchema(field.schema));
        if (field.options.required) validator = validator.required();
        break;

      default:
        validator = Joi.any();
        if (field.options.default !== undefined) validator = validator.default(field.options.default);
        if (field.options.required) validator = validator.required();
        break;
    }

    joiSchema[key] = validator;
  });

  return Joi.object(joiSchema);
};
