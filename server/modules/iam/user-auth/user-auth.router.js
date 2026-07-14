import express from "express";
import authController from "./user-auth.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";

const router = express.Router();

/* =========================
   AUTH ONLY — no authenticateToken on login/refresh (the whole point is to obtain one)
========================= */

router.post("/login", authController.login);
// Owner Controlled Authentication: PIN/Barcode/QR fast-login for shared-terminal roles.
router.post("/login/credential", authController.loginWithCredential);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticateToken, authController.logout);
router.post("/logout-all", authenticateToken, authController.logoutAllSessions);

export default router;
