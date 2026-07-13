import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import EmployeeSettingsModel from "./employee-settings.model.js";

// employeeCodeSequenceCounters is server-managed only (see
// employee-settings.model.js) — excluded so a client can never set it
// directly. Also not a valid multilingual Map (keys aren't language codes),
// so leaving it in would make joiFactory's generic Map handler
// (utils/joiFactory.js#multiLang) build the wrong validator for it.
const SERVER_MANAGED_FIELDS = ["employeeCodeSequenceCounters"];

/* =========================
   Create Schema
========================= */
export const createEmployeeSettingsSchema = createSchema(EmployeeSettingsModel.schema, {
  exclude: SERVER_MANAGED_FIELDS,
});

/* =========================
   Update Schema
========================= */
// Previously passed as a bare array (`["updatedBy"]`) instead of
// `{exclude: [...]}` — silently a no-op due to how the options object is
// spread in joiFactory.updateSchema (harmless since `updatedBy` is already
// excluded by joiFactory's own default list, but corrected for clarity —
// same fix already applied across this HR rollout).
export const updateEmployeeSettingsSchema = updateSchema(EmployeeSettingsModel.schema, {
  exclude: ["updatedBy", ...SERVER_MANAGED_FIELDS],
});

/* =========================
   Params Schema
========================= */
export const paramsEmployeeSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsEmployeeSettingsIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema
========================= */
export const queryEmployeeSettingsSchema = querySchema();
