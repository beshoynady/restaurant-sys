import Joi from "joi";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

// Helper: ObjectId validator
const objectId = () =>
  Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.error("any.invalid");
    }
    return value;
  }, "ObjectId Validation");

// Helper: Multi-language map
const multiLang = () => Joi.object().pattern(
  Joi.string().max(2).valid("EN", "AR", "FR"),  // key = language code
  Joi.string().min(2).max(100)
);

// Factory Function
export const buildJoiSchema = (mongooseSchema) => {
  const joiSchema = {};

  const paths = mongooseSchema.paths;

  Object.keys(paths).forEach((key) => {
    const field = paths[key];

    if (field.instance === "String") {
      let validator = Joi.string().trim();

      if (field.options.maxlength) validator = validator.max(field.options.maxlength);
      if (field.options.minlength) validator = validator.min(field.options.minlength);

      if (field.options.enum) validator = validator.valid(...field.options.enum);

      if (field.options.required) validator = validator.required();

      joiSchema[key] = validator;

    } else if (field.instance === "Number") {
      let validator = Joi.number();
      if (field.options.min != null) validator = validator.min(field.options.min);
      if (field.options.max != null) validator = validator.max(field.options.max);
      if (field.options.required) validator = validator.required();

      joiSchema[key] = validator;

    } else if (field.instance === "Boolean") {
      let validator = Joi.boolean();
      if (field.options.required) validator = validator.required();
      joiSchema[key] = validator;
      if (field.options.enum && Array.isArray(field.options.enum)) {
        validator = validator.valid(...field.options.enum);
      }

    } else if (field.instance === "Date") {
      let validator = Joi.date();
      if (field.options.required) validator = validator.required();
      joiSchema[key] = validator;

    } else if (field.instance === "ObjectID") {
      let validator = objectId();
      if (field.options.required) validator = validator.required();
      joiSchema[key] = validator;

    } else if (field.instance === "Map") {
      // assume multiLang
      let validator = multiLang();
      if (field.options.required) validator = validator.required();
      joiSchema[key] = validator;
    }
  });

  return Joi.object(joiSchema);
};

