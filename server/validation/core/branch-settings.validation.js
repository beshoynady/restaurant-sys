import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import BranchSettingsModel from "../../models/core/branch-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createBranchSettingsSchema = createSchema(BranchSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateBranchSettingsSchema = updateSchema(
  BranchSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const branchSettingsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const branchSettingsQuerySchema = querySchema();