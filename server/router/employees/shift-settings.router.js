import express from "express";
import shiftSettingsController from "../../controllers/employees/shift-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();



export default router;
