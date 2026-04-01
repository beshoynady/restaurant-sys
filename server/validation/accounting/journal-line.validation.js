import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import JournalLineModel from "../../models/accounting/journal-line.model.js";

/* =========================
   Create Schema
========================= */
export const createJournalLineSchema = createSchema(JournalLineModel.schema);

/* =========================
   Update Schema
========================= */
export const updateJournalLineSchema = updateSchema(
  JournalLineModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const journalLineParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const journalLineQuerySchema = querySchema();