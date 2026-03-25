import express from "express";
const router = express.Router();
// const{signup, login, refresh, logout }= require('../controllers/user-auth.controller');
import { signup, login, restPass } from "../../controllers/employees/user-auth.controller.js";

router.post("/signup", signup);
router.post("/login", login);
// router.get("/refresh",refresh);
// router.post("/logout",logout);

export default router;
