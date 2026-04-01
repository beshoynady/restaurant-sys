import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import JournalEntryModel from "../../models/accounting/journal-entry.model.js";

/* =========================
   Create Schema
========================= */
export const createJournalEntrySchema = createSchema(JournalEntryModel.schema);

/* =========================
   Update Schema
========================= */
export const updateJournalEntrySchema = updateSchema(
  JournalEntryModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const journalEntryParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const journalEntryQuerySchema = querySchema();