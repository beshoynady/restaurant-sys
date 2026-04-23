import express from "express";
import authController from "./auth.controller.js";
import authenticateToken from "../../../middlewares/authenticate-customer.js";

const router = express.Router();

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);

// protected
router.post("/register", authenticateToken, authController.register);
router.post("/logout", authenticateToken, authController.logout);

export default router;