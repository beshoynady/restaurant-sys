import express from "express";
import bankAccountController from "./bank-account.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  .post(authenticateToken, validate(createBankAccountSchema), bankAccountController.create)
  .get(authenticateToken, validate(queryBankAccountSchema), bankAccountController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsBankAccountSchema), bankAccountController.getOne)
  .put(authenticateToken, validate(updateBankAccountSchema), bankAccountController.update)
  .delete(authenticateToken, validate(paramsBankAccountSchema), bankAccountController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsBankAccountSchema), bankAccountController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsBankAccountSchema), bankAccountController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsBankAccountIdsSchema), bankAccountController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsBankAccountIdsSchema), bankAccountController.bulkSoftDelete);


export default router;
