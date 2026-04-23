import express from "express";
import productController from "./product.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createProductSchema, 
  updateProductSchema, 
  paramsProductSchema, 
  paramsProductIdsSchema,
  queryProductSchema 
} from "./product.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createProductSchema), productController.create)
  .get(authenticateToken, validate(queryProductSchema), productController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsProductSchema), productController.getOne)
  .put(authenticateToken, validate(updateProductSchema), productController.update)
  .delete(authenticateToken, validate(paramsProductSchema), productController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsProductSchema), productController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsProductSchema), productController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsProductIdsSchema), productController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsProductIdsSchema), productController.bulkSoftDelete);


export default router;
