import express from "express";
import diningAreaController from "./dining-area.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createDiningAreaSchema, 
  updateDiningAreaSchema, 
  paramsDiningAreaSchema, 
  paramsDiningAreaIdsSchema,
  queryDiningAreaSchema 
} from "./dining-area.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDiningAreaSchema), diningAreaController.create)
  .get(authenticateToken, validate(queryDiningAreaSchema), diningAreaController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsDiningAreaSchema), diningAreaController.getOne)
  .put(authenticateToken, validate(updateDiningAreaSchema), diningAreaController.update)
  .delete(authenticateToken, validate(paramsDiningAreaSchema), diningAreaController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsDiningAreaSchema), diningAreaController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsDiningAreaSchema), diningAreaController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsDiningAreaIdsSchema), diningAreaController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsDiningAreaIdsSchema), diningAreaController.bulkSoftDelete);


export default router;
