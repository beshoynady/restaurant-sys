import Joi from "joi";
import {
  createSchema,
  updateSchema,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
  objectId,
} from "../../../utils/joiFactory.js";
import AttendanceSettingsModel from "./attendance-settings.model.js";

// joiFactory's generic array builder falls back to `Joi.array().items(Joi.any())`
// for a DocumentArray field (no shape checking at all) — same case already
// handled with a manual override for BranchSettings.operatingHours. Applied
// here for the two DocumentArray fields this model has.
const holidaySchema = Joi.object({
  date: Joi.date().required(),
  name: Joi.string().trim().max(150).required(),
  isPaid: Joi.boolean(),
});

const breakDefinitionSchema = Joi.object({
  label: Joi.string().trim().max(60).allow(""),
  durationMinutes: Joi.number().min(1).max(480).required(),
  isPaid: Joi.boolean(),
});

const overrides = {
  branch: objectId(true).optional(),

  workCalendar: Joi.object({
    weeklyOffDays: Joi.array().items(
      Joi.string().valid(
        ...AttendanceSettingsModel.schema.path("workCalendar.weeklyOffDays").options.enum,
      ),
    ),
    holidays: Joi.array().items(holidaySchema),
  }).optional(),

  breakPolicy: Joi.object({
    breaks: Joi.array().items(breakDefinitionSchema),
    maxBreaksPerDay: Joi.number().min(0).max(10),
  }).optional(),
};

export const createAttendanceSettingsSchema = createSchema(AttendanceSettingsModel.schema).keys(overrides);

export const updateAttendanceSettingsSchema = updateSchema(AttendanceSettingsModel.schema, {
  exclude: ["updatedBy"],
}).keys(overrides);

export const paramsAttendanceSettingsSchema = paramsSchema();
export const paramsAttendanceSettingsIdsSchema = paramsIdsSchema();

export const queryAttendanceSettingsSchema = querySchema({
  branch: objectId(true).optional(),
  isActive: Joi.boolean().optional(),
});

// Not wired into the /resolve route below via the `validate` middleware:
// that middleware validates `req.body` by default (see middlewares/validate.js),
// and every other GET/query-filter route in this codebase already has this
// same gap (query-string filters are read directly in BaseController.getAll
// without going through Joi) — a Foundation-level inconsistency, not
// something to silently "fix" for just this one route. `branch` is validated
// as an ObjectId format manually in the controller instead.
