import Joi from "joi";
import {
  createSchema,
  updateSchema,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../../utils/joiFactory.js";
import { SUPPORTED_LANGUAGES } from "../../../utils/languages.js";
import EmployeeModel from "./employee.model.js";

// `address` is a Map keyed by language, but each value is itself a nested
// address object (country/city/...), not a plain string — joiFactory's
// generic Map handling (multiLang()) always builds a per-language STRING
// validator, so it rejected every real address payload with
// '"address.EN" must be a string' (confirmed empirically). Overridden here
// the same way createDeliveryAreaSchema/createBrandSettingsSchema override
// their own non-generic-shaped fields elsewhere in the project.
const addressEntrySchema = Joi.object({
  country: Joi.string().trim().max(100).required(),
  stateOrProvince: Joi.string().trim().max(100).allow(""),
  city: Joi.string().trim().max(100).required(),
  area: Joi.string().trim().max(100).allow(""),
  street: Joi.string().trim().max(150).allow(""),
  buildingNumber: Joi.string().trim().max(20).allow(""),
  floor: Joi.string().trim().max(10).allow(""),
  landmark: Joi.string().trim().max(150).allow(""),
});

const addressSchema = Joi.object(
  Object.fromEntries(SUPPORTED_LANGUAGES.map((lang) => [lang, addressEntrySchema.optional()])),
)
  .min(1)
  .unknown(false)
  .optional();

/* =========================
   Create Schema
========================= */
// `employeeCode` is optional here (though still `required` on the Mongoose
// schema) because employee-settings.service.js#applyToNewEmployee can now
// auto-generate one when the brand's EmployeeSettings.employeeCode.autoGenerate
// is enabled — that happens in employee.service.js#beforeCreate, after Joi
// validation has already run, so the HTTP layer must not reject an omitted
// code up front. A brand with auto-generation disabled still effectively
// requires it: the Mongoose-level `required` throws if neither the client
// nor the auto-generator supplied one.
export const createEmployeeSchema = createSchema(EmployeeModel.schema).keys({
  address: addressSchema,
  employeeCode: Joi.string().trim().uppercase().min(3).max(20).optional(),
});

/* =========================
   Update Schema
========================= */
export const updateEmployeeSchema = updateSchema(EmployeeModel.schema, {
  exclude: ["updatedBy"],
}).keys({
  address: addressSchema,
});

/* =========================
   Params Schema
========================= */
export const paramsEmployeeSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsEmployeeIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema (HR Filters)
========================= */
/**
 * Notes (EN):
 * - BaseController.getAll passes ALL req.query keys as `filters` (excluding page/limit/search/includeDeleted/sort/select).
 * - querySchema() is strict (unknown(false)), so we must explicitly allow HR filter fields here.
 * - ObjectId fields use the same validation as in the rest of the project (via joiFactory ObjectId validator inside buildFieldValidator).
 */
export const queryEmployeeSchema = querySchema({
  // ObjectId filters
  brand: Joi.string().optional(),
  department: Joi.string().optional(),
  jobTitle: Joi.string().optional(),
  shift: Joi.string().optional(),
  reportsTo: Joi.string().optional(),

  // String filters
  status: Joi.string().trim().optional(),
  workMode: Joi.string().trim().optional(),
  contractType: Joi.string().trim().optional(),

  // Boolean filters
  hasAccount: Joi.boolean().optional(),
  isVerified: Joi.boolean().optional(),
  isOwner: Joi.boolean().optional(),
});
