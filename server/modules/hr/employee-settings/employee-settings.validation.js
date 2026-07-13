import Joi from "joi";
import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import EmployeeSettingsModel, { LEAVE_TYPES } from "./employee-settings.model.js";

// employeeCodeSequenceCounters is server-managed only (see
// employee-settings.model.js) — excluded so a client can never set it
// directly. Also not a valid multilingual Map (keys aren't language codes),
// so leaving it in would make joiFactory's generic Map handler
// (utils/joiFactory.js#multiLang) build the wrong validator for it.
const SERVER_MANAGED_FIELDS = ["employeeCodeSequenceCounters"];

// `leavePolicy.policies` is a Map<leaveType, entry> and `.blackoutPeriods`
// is a DocumentArray — joiFactory's generic handlers build the wrong
// validator for both (Map -> assumes language-keyed strings; DocumentArray
// -> falls back to `Joi.array().items(Joi.any())`, no shape checking at
// all). Same class of override already used for AttendanceSettings'
// `holidays`/`breaks` and BranchSettings' `operatingHours`.
const leavePolicyEntrySchema = Joi.object({
  annualDays: Joi.number().min(0).max(365),
  isPaidByDefault: Joi.boolean(),
  requiresApproval: Joi.boolean(),
  allowCarryForward: Joi.boolean(),
  maxCarryForwardDays: Joi.number().min(0),
  allowNegativeBalance: Joi.boolean(),
  accrualMethod: Joi.string().valid("upfront", "monthly", "none"),
  expiryMonths: Joi.number().min(0),
});

const leavePolicyOverride = {
  leavePolicy: Joi.object({
    policies: Joi.object().pattern(Joi.string().valid(...LEAVE_TYPES), leavePolicyEntrySchema),
    defaultPolicy: leavePolicyEntrySchema,
    blackoutPeriods: Joi.array().items(
      Joi.object({
        startDate: Joi.date().required(),
        endDate: Joi.date().required(),
        reason: Joi.string().trim().max(200).allow(""),
      }),
    ),
    minimumDepartmentCoverageRatio: Joi.number().min(0).max(1),
  }).optional(),
};

/* =========================
   Create Schema
========================= */
export const createEmployeeSettingsSchema = createSchema(EmployeeSettingsModel.schema, {
  exclude: SERVER_MANAGED_FIELDS,
}).keys(leavePolicyOverride);

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
}).keys(leavePolicyOverride);

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
