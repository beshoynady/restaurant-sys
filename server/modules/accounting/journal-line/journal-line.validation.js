import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import JournalLineModel from "./journal-line.model.js";

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
export const paramsJournalLineSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsJournalLineIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryJournalLineSchema = querySchema();