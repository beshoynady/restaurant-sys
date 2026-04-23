import express from "express";
import accountController from "./account.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createAccountSchema, 
  updateAccountSchema, 
  paramsAccountSchema, 
  paramsAccountIdsSchema,
  queryAccountSchema 
} from "./account.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAccountSchema), accountController.create)
  .get(authenticateToken, validate(queryAccountSchema), accountController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAccountSchema), accountController.getOne)
  .put(authenticateToken, validate(updateAccountSchema), accountController.update)
  .delete(authenticateToken, validate(paramsAccountSchema), accountController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAccountSchema), accountController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAccountSchema), accountController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsAccountIdsSchema), accountController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsAccountIdsSchema), accountController.bulkSoftDelete);


export default router;
