import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import JournalEntryModel from "./journal-entry.model.js";

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
export const paramsJournalEntrySchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsJournalEntryIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryJournalEntrySchema = querySchema();