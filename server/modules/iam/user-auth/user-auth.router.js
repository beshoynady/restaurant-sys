import express from "express";
import authController from "./user-auth.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";

const router = express.Router();

/* =========================
   AUTH ONLY
========================= */
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticateToken, authController.logout);

export default router;