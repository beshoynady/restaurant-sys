import express from "express";
import ledgerController from "../../controllers/accounting/ledger.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();



export default router;
