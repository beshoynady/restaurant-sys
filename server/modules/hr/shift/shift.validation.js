import Joi from "joi";
import {
  createSchema,
  updateSchema,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../../utils/joiFactory.js";
import ShiftModel from "./shift.model.js";

/* =========================
   Create Schema
========================= */
export const createShiftSchema = createSchema(ShiftModel.schema);

/* =========================
   Update Schema
========================= */
// Previously passed as a bare array instead of `{exclude:[...]}` — silently
// a no-op (harmless, `updatedBy` is already excluded by joiFactory's own
// default list) but corrected for clarity — same fix already applied
// throughout this HR rollout.
export const updateShiftSchema = updateSchema(ShiftModel.schema, { exclude: ["updatedBy"] });

/* =========================
   Params Schema
========================= */
export const paramsShiftSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsShiftIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema (HR Filters)
========================= */
/**
 * Notes (EN):
 * - BaseController.getAll passes ALL req.query keys as `filters` (excluding page/limit/search/includeDeleted/sort/select).
 * - querySchema() is strict (unknown(false)), so we must explicitly allow filter fields used by frontend.
 */
export const queryShiftSchema = querySchema({
  // ObjectId filters (stored as strings in query params)
  branch: Joi.string().optional(),

  // String filters
  code: Joi.string().trim().optional(),
  status: Joi.string()
    .valid(...ShiftModel.schema.path("status").options.enum)
    .optional(),
  shiftType: Joi.string()
    .valid(...ShiftModel.schema.path("shiftType").options.enum)
    .optional(),
});
