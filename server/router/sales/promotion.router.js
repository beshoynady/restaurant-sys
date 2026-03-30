import express from "express";
import promotionController from "../../controllers/sales/promotion.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createpromotionSchema, updatepromotionSchema } from "../../validation/sales/promotion.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createpromotionSchema), promotionController.create)
  .get(authenticateToken, promotionController.getAll)
;

router.route("/:id")
  .get(authenticateToken, promotionController.getOne)
  .put(authenticateToken, validate(updatepromotionSchema), promotionController.update)
  .delete(authenticateToken, promotionController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, promotionController.restore)
;



export default router;
