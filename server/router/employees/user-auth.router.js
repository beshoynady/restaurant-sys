// employees/user-auth.router.js
import express from "express";
import userAuthController from "../../controllers/employees/user-auth.controller.js";

const router = express.Router();

// Signup
router
  .route("/signup")
  .post(userAuthController.signup);

// Login
router
  .route("/login")
  .post(userAuthController.login);

// Reset password
router
  .route("/reset-password")
  .patch(userAuthController.restPass);

export default router;