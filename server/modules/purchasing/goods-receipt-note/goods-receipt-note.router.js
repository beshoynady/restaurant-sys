import express from "express";
import goodsReceiptNoteController from "./goods-receipt-note.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createGoodsReceiptNoteSchema,
  updateGoodsReceiptNoteSchema,
  paramsGoodsReceiptNoteSchema,
  paramsGoodsReceiptNoteIdsSchema,
  queryGoodsReceiptNoteSchema,
} from "./goods-receipt-note.validation.js";

const router = express.Router();

router.route("/")
  .post(authenticateToken, authorize("GoodsReceiptNotes", "create"), checkModuleEnabled("inventory"), validate(createGoodsReceiptNoteSchema), goodsReceiptNoteController.create)
  .get(authenticateToken, authorize("GoodsReceiptNotes", "read"), checkModuleEnabled("inventory"), validate(queryGoodsReceiptNoteSchema), goodsReceiptNoteController.getAll)
;

router.route("/:id")
  .get(authenticateToken, authorize("GoodsReceiptNotes", "read"), checkModuleEnabled("inventory"), validate(paramsGoodsReceiptNoteSchema, "params"), goodsReceiptNoteController.getOne)
  .put(authenticateToken, authorize("GoodsReceiptNotes", "update"), checkModuleEnabled("inventory"), validate(updateGoodsReceiptNoteSchema), goodsReceiptNoteController.update)
  .delete(authenticateToken, authorize("GoodsReceiptNotes", "delete"), checkModuleEnabled("inventory"), validate(paramsGoodsReceiptNoteSchema, "params"), goodsReceiptNoteController.hardDelete)
;

// The action that actually posts stock — a distinct, auditable route, not a generic PUT.
router.route("/:id/confirm")
  .post(authenticateToken, authorize("GoodsReceiptNotes", "approve"), checkModuleEnabled("inventory"), validate(paramsGoodsReceiptNoteSchema, "params"), goodsReceiptNoteController.confirm);

router.route("/:id/cancel")
  .post(authenticateToken, authorize("GoodsReceiptNotes", "update"), checkModuleEnabled("inventory"), validate(paramsGoodsReceiptNoteSchema, "params"), goodsReceiptNoteController.cancel);

router.route("/bulk-delete")
  .delete(authenticateToken, authorize("GoodsReceiptNotes", "delete"), checkModuleEnabled("inventory"), validate(paramsGoodsReceiptNoteIdsSchema), goodsReceiptNoteController.bulkHardDelete);

export default router;
