import express from "express";
import bankAccountController from "./bank-account.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createBankAccountSchema, 
  updateBankAccountSchema, 
  paramsBankAccountSchema, 
  paramsBankAccountIdsSchema,
  queryBankAccountSchema 
} from "./bank-account.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("BankAccounts", "create"),
    checkModuleEnabled("financial"), validate(createBankAccountSchema), bankAccountController.create)
  .get(authenticateToken,
    authorize("BankAccounts", "read"),
    checkModuleEnabled("financial"), validate(queryBankAccountSchema), bankAccountController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("BankAccounts", "read"),
    checkModuleEnabled("financial"), validate(paramsBankAccountSchema), bankAccountController.getOne)
  .put(authenticateToken,
    authorize("BankAccounts", "update"),
    checkModuleEnabled("financial"), validate(updateBankAccountSchema), bankAccountController.update)
  .delete(authenticateToken,
    authorize("BankAccounts", "delete"),
    checkModuleEnabled("financial"), validate(paramsBankAccountSchema), bankAccountController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("BankAccounts", "delete"),
    checkModuleEnabled("financial"), validate(paramsBankAccountSchema), bankAccountController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("BankAccounts", "update"),
    checkModuleEnabled("financial"), validate(paramsBankAccountSchema), bankAccountController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("BankAccounts", "delete"),
    checkModuleEnabled("financial"), validate(paramsBankAccountIdsSchema), bankAccountController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("BankAccounts", "delete"),
    checkModuleEnabled("financial"),validate(paramsBankAccountIdsSchema), bankAccountController.bulkSoftDelete);


export default router;
