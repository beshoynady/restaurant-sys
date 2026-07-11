import Joi, { ObjectSchema } from "joi";
import joiFactoryJs from "../../../utils/joiFactory.js";
import BranchSettingsModel from "./branch-settings.model.js";

const { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } =
  joiFactoryJs as {
    createSchema: (schema: unknown) => ObjectSchema;
    updateSchema: (schema: unknown, exclude?: string[]) => ObjectSchema;
    paramsSchema: () => ObjectSchema;
    paramsIdsSchema: () => ObjectSchema;
    querySchema: () => ObjectSchema;
  };

// Validate time format HH:mm
const timeSchema = Joi.string()
  .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
  .message("Time must be in HH:mm format");

export const createBranchSettingsSchema: ObjectSchema = createSchema(
  BranchSettingsModel.schema,
).keys({
  operatingHours: Joi.array().items(
    Joi.object({
      day: Joi.string().required(),
      status: Joi.string().valid("open", "closed", "holiday"),

      periods: Joi.array().items(
        Joi.object({
          name: Joi.string(),

          openTime: timeSchema.required(),
          closeTime: timeSchema.required(),

          services: Joi.object({
            dineIn: Joi.object({
              enabled: Joi.boolean(),
              openTime: timeSchema.allow(null, ""),
              closeTime: timeSchema.allow(null, ""),
            }),
            takeaway: Joi.object({
              enabled: Joi.boolean(),
              openTime: timeSchema.allow(null, ""),
              closeTime: timeSchema.allow(null, ""),
            }),
            delivery: Joi.object({
              enabled: Joi.boolean(),
              openTime: timeSchema.allow(null, ""),
              closeTime: timeSchema.allow(null, ""),
              minOrderAmount: Joi.number().min(0),
              estimatedTimeMinutes: Joi.number().min(0),
            }),
          }),

          pauses: Joi.array().items(
            Joi.object({
              reason: Joi.string(),
              from: timeSchema,
              to: timeSchema,
            }),
          ),
        }),
      ),
    }),
  ),
});

export const updateBranchSettingsSchema: ObjectSchema = updateSchema(
  BranchSettingsModel.schema,
  ["updatedBy"],
);

export const paramsBranchSettingsSchema: ObjectSchema = paramsSchema();
export const paramsBranchSettingsIdsSchema: ObjectSchema = paramsIdsSchema();
export const queryBranchSettingsSchema: ObjectSchema = querySchema();
