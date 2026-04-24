import Joi from "joi";
import {
  createSchema,
  updateSchema,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
  objectId,
} from "../../../utils/joiFactory.js";

import BranchSettingsModel from "../../models/core/branch-settings.model.js";

/* =========================
   Custom Validation
========================= */

// Validate time format HH:mm
const timeSchema = Joi.string()
  .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
  .message("Time must be in HH:mm format");

/* =========================
   Create Schema
========================= */
export const createBranchSettingsSchema = createSchema(
  BranchSettingsModel.schema
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
            })
          ),
        })
      ),
    })
  ),
});

/* =========================
   Update Schema
========================= */
export const updateBranchSettingsSchema = updateSchema(
  BranchSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params
========================= */
export const paramsBranchSettingsSchema = paramsSchema();
export const paramsBranchSettingsIdsSchema = paramsIdsSchema();

/* =========================
   Query
========================= */
export const queryBranchSettingsSchema = querySchema();