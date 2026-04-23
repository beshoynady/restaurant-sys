import express from "express";
import userAuthController from "./user-auth.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
// import { 
//   createUserAuthSchema, 
//   updateUserAuthSchema, 
//   paramsUserAuthSchema, 
//   paramsUserAuthIdsSchema,
//   queryUserAuthSchema 
// } from "./user-auth.validation.js";

const router = express.Router();

// // Create & GetAll
// router.route("/")
//   .post(authenticateToken, validate(createUserAuthSchema), userAuthController.create)
//   .get(authenticateToken, validate(queryUserAuthSchema), userAuthController.getAll)
// ;

// // GetOne, Update, hardDelete
// router.route("/:id")
//   .get(authenticateToken, validate(paramsUserAuthSchema), userAuthController.getOne)
//   .put(authenticateToken, validate(updateUserAuthSchema), userAuthController.update)
//   .delete(authenticateToken, validate(paramsUserAuthSchema), userAuthController.hardDelete) // soft delete
// ;

// router.route("/soft-delete/:id")
//   .patch(authenticateToken, validate(paramsUserAuthSchema), userAuthController.softDelete) // soft delete
// ;

// // Restore soft-deleted item
// router.route("/restore/:id")
//   .patch(authenticateToken, validate(paramsUserAuthSchema), userAuthController.restore)
// ;

//  // --- BULK HARD DELETE ---
//   router.route("/bulk-delete")
//     .delete(authenticateToken, validate(paramsUserAuthIdsSchema), userAuthController.bulkHardDelete);


//   // --- BULK SOFT DELETE ---
//   router.route("/bulk-soft-delete")
//     .patch(authenticateToken,validate(paramsUserAuthIdsSchema), userAuthController.bulkSoftDelete);


export default router;
