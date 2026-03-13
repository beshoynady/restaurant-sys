const express = require("express");
const router = express.Router();

const {
  createProductionRecord,
  findAllProductionRecords,
  findProductionRecord,
  endProductionRecord,
  updateProductionRecord,
  deleteProductionRecord,
} = require("../../controllers/production-record.controller.js");

const { authenticateToken } = require("../../middlewares/authenticate.js");
const checkSubscription = require("../../middlewares/checkSubscription.js");

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

module.exports = router;
