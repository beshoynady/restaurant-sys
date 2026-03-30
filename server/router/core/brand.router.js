import express from "express";
import brandController from "../../controllers/core/brand.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createbrandSchema, updatebrandSchema } from "../../validation/core/brand.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createbrandSchema), brandController.create)
  .get(authenticateToken, brandController.getAll)
;

router.route("/:id")
  .get(authenticateToken, brandController.getOne)
  .put(authenticateToken, validate(updatebrandSchema), brandController.update)
  .delete(authenticateToken, brandController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, brandController.restore)
;



export default router;
