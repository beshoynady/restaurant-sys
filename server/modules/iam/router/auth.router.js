import express from "express";
import controller from "./auth.controller.js";
import authenticateToken from "../../middlewares/authenticateToken.js";

const router = express.Router();

router.post("/login", controller.login);
router.post("/refresh", controller.refresh);

// protected
router.post("/register", authenticateToken, controller.register);
router.post("/logout", authenticateToken, controller.logout);

export default router;