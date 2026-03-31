import express from "express";
import diningAreaController from "../../controllers/seating/dining-area.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createDiningAreaSchema, updateDiningAreaSchema } from "../../validation/seating/dining-area.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createDiningAreaSchema), diningAreaController.create)
  .get(authenticateToken, diningAreaController.getAll)
;

router.route("/:id")
  .get(authenticateToken, diningAreaController.getOne)
  .put(authenticateToken, validate(updateDiningAreaSchema), diningAreaController.update)
  .delete(authenticateToken, diningAreaController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, diningAreaController.restore)
;



export default router;
