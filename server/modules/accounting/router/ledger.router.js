import express from "express";
import ledgerController from "../../controllers/accounting/ledger.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
// import { 
//   createLedgerSchema, 
//   updateLedgerSchema, 
//   paramsLedgerSchema, 
//   paramsLedgerIdsSchema,
//   queryLedgerSchema 
// } from "../../validation/accounting/ledger.validation.js";

const router = express.Router();

// // Create & GetAll
// router.route("/")
//   .post(authenticateToken, validate(createLedgerSchema), ledgerController.create)
//   .get(authenticateToken, validate(queryLedgerSchema), ledgerController.getAll)
// ;

// // GetOne, Update, hardDelete
// router.route("/:id")
//   .get(authenticateToken, validate(paramsLedgerSchema), ledgerController.getOne)
//   .put(authenticateToken, validate(updateLedgerSchema), ledgerController.update)
//   .delete(authenticateToken, validate(paramsLedgerSchema), ledgerController.hardDelete) // soft delete
// ;

// router.route("/soft-delete/:id")
//   .patch(authenticateToken, validate(paramsLedgerSchema), ledgerController.softDelete) // soft delete
// ;

// // Restore soft-deleted item
// router.route("/restore/:id")
//   .patch(authenticateToken, validate(paramsLedgerSchema), ledgerController.restore)
// ;

//  // --- BULK HARD DELETE ---
//   router.route("/bulk-delete")
//     .delete(authenticateToken, validate(paramsLedgerIdsSchema), ledgerController.bulkHardDelete);


//   // --- BULK SOFT DELETE ---
//   router.route("/bulk-soft-delete")
//     .patch(authenticateToken,validate(paramsLedgerIdsSchema), ledgerController.bulkSoftDelete);


export default router;
