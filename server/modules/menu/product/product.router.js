import express from "express";
import productController from "./product.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
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
  .post(authenticateToken,
    authorize("Products", "create"),
    checkModuleEnabled("menu"), validate(createProductSchema), productController.create)
  .get(authenticateToken,
    authorize("Products", "read"),
    checkModuleEnabled("menu"), validate(queryProductSchema), productController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Products", "read"),
    checkModuleEnabled("menu"), validate(paramsProductSchema), productController.getOne)
  .put(authenticateToken,
    authorize("Products", "update"),
    checkModuleEnabled("menu"), validate(updateProductSchema), productController.update)
  .delete(authenticateToken,
    authorize("Products", "delete"),
    checkModuleEnabled("menu"), validate(paramsProductSchema), productController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Products", "delete"),
    checkModuleEnabled("menu"), validate(paramsProductSchema), productController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Products", "update"),
    checkModuleEnabled("menu"), validate(paramsProductSchema), productController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Products", "delete"),
    checkModuleEnabled("menu"), validate(paramsProductIdsSchema), productController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Products", "delete"),
    checkModuleEnabled("menu"),validate(paramsProductIdsSchema), productController.bulkSoftDelete);


export default router;
