import express from "express";
import productReviewController from "../../controllers/sales/product-review.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createproductReviewSchema, updateproductReviewSchema } from "../../validation/sales/product-review.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createproductReviewSchema), productReviewController.create)
  .get(authenticateToken, productReviewController.getAll)
;

router.route("/:id")
  .get(authenticateToken, productReviewController.getOne)
  .put(authenticateToken, validate(updateproductReviewSchema), productReviewController.update)
  .delete(authenticateToken, productReviewController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, productReviewController.restore)
;



export default router;
