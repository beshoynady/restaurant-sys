import express from "express";
import userAuthController from "../../controllers/employees/user-auth.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, userAuthController.create)
;



export default router;
