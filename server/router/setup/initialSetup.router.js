import express from "express";
import initialSetupController from "../../controllers/setup/initialSetup.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, initialSetupController)
;



export default router;
