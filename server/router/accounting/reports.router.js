import express from "express";
import reportsController from "../../controllers/accounting/reports.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();



export default router;
