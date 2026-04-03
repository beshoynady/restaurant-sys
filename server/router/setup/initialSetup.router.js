import express from "express";
import initialSetupController from "../../controllers/setup/initialSetup.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
// import { 
//   createInitialSetupSchema, 
//   updateInitialSetupSchema, 
//   paramsInitialSetupSchema, 
//   paramsInitialSetupIdsSchema,
//   queryInitialSetupSchema 
// } from "../../validation/setup/initialSetup.validation.js";

const router = express.Router();

// // Create & GetAll
// router.route("/")
//   .post(authenticateToken, validate(createInitialSetupSchema), initialSetupController.create)
//   .get(authenticateToken, validate(queryInitialSetupSchema), initialSetupController.getAll)
// ;

// // GetOne, Update, hardDelete
// router.route("/:id")
//   .get(authenticateToken, validate(paramsInitialSetupSchema), initialSetupController.getOne)
//   .put(authenticateToken, validate(updateInitialSetupSchema), initialSetupController.update)
//   .delete(authenticateToken, validate(paramsInitialSetupSchema), initialSetupController.hardDelete) // soft delete
// ;

// router.route("/soft-delete/:id")
//   .patch(authenticateToken, validate(paramsInitialSetupSchema), initialSetupController.softDelete) // soft delete
// ;

// // Restore soft-deleted item
// router.route("/restore/:id")
//   .patch(authenticateToken, validate(paramsInitialSetupSchema), initialSetupController.restore)
// ;

//  // --- BULK HARD DELETE ---
//   router.route("/bulk-delete")
//     .delete(authenticateToken, validate(paramsInitialSetupIdsSchema), initialSetupController.bulkHardDelete);


//   // --- BULK SOFT DELETE ---
//   router.route("/bulk-soft-delete")
//     .patch(authenticateToken,validate(paramsInitialSetupIdsSchema), initialSetupController.bulkSoftDelete);


export default router;
