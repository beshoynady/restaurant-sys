import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import CashierShiftSettingsModel from "./cashier-shift-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createShiftSettingsSchema = createSchema(CashierShiftSettingsModel.schema);

/* =========================
   Update Schema
========================= */
// Previously passed as a bare array instead of `{exclude:[...]}` — silently
// a no-op (harmless, `updatedBy` is already excluded by joiFactory's own
// default list) but corrected for clarity — same fix already applied
// throughout this HR rollout.
export const updateShiftSettingsSchema = updateSchema(CashierShiftSettingsModel.schema, {
  exclude: ["updatedBy"],
});

/* =========================
   Params Schema
========================= */
export const paramsShiftSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsShiftSettingsIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema
========================= */
export const queryShiftSettingsSchema = querySchema();
