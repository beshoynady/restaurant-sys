import express from "express";
import productReviewController from "./product-review.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createProductReviewSchema,
  updateProductReviewSchema,
  paramsProductReviewSchema,
  paramsProductReviewIdsSchema,
  queryProductReviewSchema
} from "./product-review.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("ProductReviews", "create"),
    checkModuleEnabled("menu"), validate(createProductReviewSchema), productReviewController.create)
  .get(authenticateToken,
    authorize("ProductReviews", "read"),
    checkModuleEnabled("menu"), validate(queryProductReviewSchema), productReviewController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("ProductReviews", "read"),
    checkModuleEnabled("menu"), validate(paramsProductReviewSchema, "params"), productReviewController.getOne)
  .put(authenticateToken,
    authorize("ProductReviews", "update"),
    checkModuleEnabled("menu"), validate(updateProductReviewSchema), productReviewController.update)
  .delete(authenticateToken,
    authorize("ProductReviews", "delete"),
    checkModuleEnabled("menu"), validate(paramsProductReviewSchema, "params"), productReviewController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("ProductReviews", "delete"),
    checkModuleEnabled("menu"), validate(paramsProductReviewSchema, "params"), productReviewController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("ProductReviews", "update"),
    checkModuleEnabled("menu"), validate(paramsProductReviewSchema, "params"), productReviewController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("ProductReviews", "delete"),
    checkModuleEnabled("menu"), validate(paramsProductReviewIdsSchema), productReviewController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("ProductReviews", "delete"),
    checkModuleEnabled("menu"),validate(paramsProductReviewIdsSchema), productReviewController.bulkSoftDelete);


export default router;
