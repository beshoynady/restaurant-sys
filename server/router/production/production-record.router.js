import express from "express";
const router = express.Router();

import {
  createProductionRecord,
  findAllProductionRecords,
  findProductionRecord,
  endProductionRecord,
  updateProductionRecord,
  deleteProductionRecord,
} from "../../controllers/production-record.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";
import checkSubscription from "../../middlewares/checkSubscription.js";

// Create a new Production Record
router
  .route("/")
  .post(authenticateToken,createProductionRecord)
  .get(authenticateToken,findAllProductionRecords);

// Retrieve all Production Records
router
  .route("/:productionRecordId")
  .get(authenticateToken,findProductionRecord)
  .put(authenticateToken,updateProductionRecord)
  .delete(authenticateToken,deleteProductionRecord);

// End a Production Record
router
  .route("/end/:productionRecordId")
  .put(authenticateToken,endProductionRecord);

export default router;
