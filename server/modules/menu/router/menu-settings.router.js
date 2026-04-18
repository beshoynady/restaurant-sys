import express from "express";
import menuSettingsController from "../../controllers/menu/menu-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createMenuSettingsSchema, 
  updateMenuSettingsSchema, 
  paramsMenuSettingsSchema, 
  paramsMenuSettingsIdsSchema,
  queryMenuSettingsSchema 
} from "../../validation/menu/menu-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createMenuSettingsSchema), menuSettingsController.create)
  .get(authenticateToken, validate(queryMenuSettingsSchema), menuSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsMenuSettingsSchema), menuSettingsController.getOne)
  .put(authenticateToken, validate(updateMenuSettingsSchema), menuSettingsController.update)
  .delete(authenticateToken, validate(paramsMenuSettingsSchema), menuSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsMenuSettingsSchema), menuSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsMenuSettingsSchema), menuSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsMenuSettingsIdsSchema), menuSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsMenuSettingsIdsSchema), menuSettingsController.bulkSoftDelete);


export default router;
