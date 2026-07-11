import express from "express";
import accountController from "./account.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
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
  .post(authenticateToken,
    authorize("Accounts", "create"),
    checkModuleEnabled("accounting"), validate(createAccountSchema), accountController.create)
  .get(authenticateToken,
    authorize("Accounts", "read"),
    checkModuleEnabled("accounting"), validate(queryAccountSchema), accountController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Accounts", "read"),
    checkModuleEnabled("accounting"), validate(paramsAccountSchema), accountController.getOne)
  .put(authenticateToken,
    authorize("Accounts", "update"),
    checkModuleEnabled("accounting"), validate(updateAccountSchema), accountController.update)
  .delete(authenticateToken,
    authorize("Accounts", "delete"),
    checkModuleEnabled("accounting"), validate(paramsAccountSchema), accountController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Accounts", "delete"),
    checkModuleEnabled("accounting"), validate(paramsAccountSchema), accountController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Accounts", "update"),
    checkModuleEnabled("accounting"), validate(paramsAccountSchema), accountController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Accounts", "delete"),
    checkModuleEnabled("accounting"), validate(paramsAccountIdsSchema), accountController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Accounts", "delete"),
    checkModuleEnabled("accounting"),validate(paramsAccountIdsSchema), accountController.bulkSoftDelete);


export default router;
