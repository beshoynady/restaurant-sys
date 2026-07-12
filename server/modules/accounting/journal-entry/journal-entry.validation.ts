import Joi from "joi";
import {
  objectId,
  createSchema,
  updateSchema,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../../utils/joiFactory.js";
import JournalEntryModel from "./journal-entry.model.js";

/* =========================
   Create Schema (header only — existing behavior)
========================= */
// Audit finding (Joi schema vs. schema-change consistency, prompted while reviewing this file for
// DB-010/DB-014): `totalDebit`/`totalCredit`/`isBalanced` are `required: true` at the Mongoose
// schema-option level (DB-009) — Mongoose itself is satisfied by their `default` values, but the
// generic `createSchema()` factory marks ANY `required: true` field as `.required()` in the Joi
// schema regardless of a default, which would have forced every client of the plain
// `POST /journal-entries` endpoint to explicitly supply these server/service-computed fields.
// Excluded here, matching the `orderNum`/`serial` exclusion pattern used elsewhere in this same
// batch of work.
export const createJournalEntrySchema = createSchema(JournalEntryModel.schema, {
  exclude: ["totalDebit", "totalCredit", "isBalanced"],
});

/* =========================
   Create-With-Lines Schema (DB-010 — new)
========================= */
const journalLineInputSchema = Joi.object({
  account: objectId().required(),
  description: Joi.string().trim().max(300).required(),
  debit: Joi.number().min(0).default(0),
  credit: Joi.number().min(0).default(0),
  currency: Joi.string().trim().uppercase().required(),
  exchangeRate: Joi.number().min(0).default(1),
  convertedDebit: Joi.number().min(0).default(0),
  convertedCredit: Joi.number().min(0).default(0),
  costCenter: objectId(true).optional(),
  sourceType: Joi.string()
    .valid(
      "PAYROLL_RUN",
      "SALES_INVOICE",
      "PURCHASE_INVOICE",
      "SALES_RETURN",
      "PURCHASE_RETURN",
      "EXPENSE_VOUCHER",
      "ASSET_DOCUMENT",
      "CASH_MOVEMENT",
      "MANUAL_ENTRY",
    )
    .optional(),
  sourceRef: objectId(true).optional(),
});

export const createJournalEntryWithLinesSchema = Joi.object({
  period: objectId().required(),
  date: Joi.date().optional(),
  entryNumber: Joi.string().trim().max(30).required(),
  description: Joi.string().trim().max(500).required(),
  origin: Joi.string().valid("System", "Manual", "Adjusting", "Closing").optional(),
  baseCurrency: Joi.string().trim().uppercase().allow(null).optional(),
  autoPost: Joi.boolean().optional(),
  lines: Joi.array().items(journalLineInputSchema).min(2).required(),
}).unknown(false);

/* =========================
   Update Schema
========================= */
export const updateJournalEntrySchema = updateSchema(JournalEntryModel.schema, {
  exclude: ["updatedBy"],
});

/* =========================
   Params Schema
========================= */
export const paramsJournalEntrySchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsJournalEntryIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema
========================= */
export const queryJournalEntrySchema = querySchema();
