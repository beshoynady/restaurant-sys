import express from "express";
import reportsController from "../../controllers/accounting/reports.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
// import { 
//   createReportsSchema, 
//   updateReportsSchema, 
//   paramsReportsSchema, 
//   paramsReportsIdsSchema,
//   queryReportsSchema 
// } from "../../validation/accounting/reports.validation.js";

const router = express.Router();

// // Create & GetAll
// router.route("/")
//   .post(authenticateToken, validate(createReportsSchema), reportsController.create)
//   .get(authenticateToken, validate(queryReportsSchema), reportsController.getAll)
// ;

// // GetOne, Update, hardDelete
// router.route("/:id")
//   .get(authenticateToken, validate(paramsReportsSchema), reportsController.getOne)
//   .put(authenticateToken, validate(updateReportsSchema), reportsController.update)
//   .delete(authenticateToken, validate(paramsReportsSchema), reportsController.hardDelete) // soft delete
// ;

// router.route("/soft-delete/:id")
//   .patch(authenticateToken, validate(paramsReportsSchema), reportsController.softDelete) // soft delete
// ;

// // Restore soft-deleted item
// router.route("/restore/:id")
//   .patch(authenticateToken, validate(paramsReportsSchema), reportsController.restore)
// ;

//  // --- BULK HARD DELETE ---
//   router.route("/bulk-delete")
//     .delete(authenticateToken, validate(paramsReportsIdsSchema), reportsController.bulkHardDelete);


//   // --- BULK SOFT DELETE ---
//   router.route("/bulk-soft-delete")
//     .patch(authenticateToken,validate(paramsReportsIdsSchema), reportsController.bulkSoftDelete);


export default router;
