import express from "express";
const router = express.Router();
// const{signup, login, refresh, logout }= require('../controllers/auth.controller');
import { signup, login } from "../../controllers/employees/auth.controller.js";

router.post("/signup", signup);
router.post("/login", login);
// router.get("/refresh",refresh);
// router.post("/logout",logout);

export default router;
