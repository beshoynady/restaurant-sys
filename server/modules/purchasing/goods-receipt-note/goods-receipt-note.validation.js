import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import GoodsReceiptNoteModel from "./goods-receipt-note.model.js";

export const createGoodsReceiptNoteSchema = createSchema(GoodsReceiptNoteModel.schema);
export const updateGoodsReceiptNoteSchema = updateSchema(GoodsReceiptNoteModel.schema, ["updatedBy"]);
export const paramsGoodsReceiptNoteSchema = paramsSchema();
export const paramsGoodsReceiptNoteIdsSchema = paramsIdsSchema();
export const queryGoodsReceiptNoteSchema = querySchema();
