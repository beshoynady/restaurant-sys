import express from "express";
import discountSettingController from "../../controllers/system/discount-setting.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();



export default router;
