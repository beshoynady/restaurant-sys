import express from "express";
import productReviewController from "./product-review.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  .post(authenticateToken, validate(createProductReviewSchema), productReviewController.create)
  .get(authenticateToken, validate(queryProductReviewSchema), productReviewController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsProductReviewSchema, "params"), productReviewController.getOne)
  .put(authenticateToken, validate(updateProductReviewSchema), productReviewController.update)
  .delete(authenticateToken, validate(paramsProductReviewSchema, "params"), productReviewController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsProductReviewSchema, "params"), productReviewController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsProductReviewSchema, "params"), productReviewController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsProductReviewIdsSchema), productReviewController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsProductReviewIdsSchema), productReviewController.bulkSoftDelete);


export default router;
