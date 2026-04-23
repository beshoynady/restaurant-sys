import express from "express";
import brandController from "./brand.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createBrandSchema, 
  updateBrandSchema, 
  paramsBrandSchema, 
  paramsBrandIdsSchema,
  queryBrandSchema 
} from "./brand.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createBrandSchema), brandController.create)
  .get(authenticateToken, validate(queryBrandSchema), brandController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsBrandSchema), brandController.getOne)
  .put(authenticateToken, validate(updateBrandSchema), brandController.update)
  .delete(authenticateToken, validate(paramsBrandSchema), brandController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsBrandSchema), brandController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsBrandSchema), brandController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsBrandIdsSchema), brandController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsBrandIdsSchema), brandController.bulkSoftDelete);


export default router;
