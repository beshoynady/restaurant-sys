const express = require("express");
const router = express.Router();
const {
  getAllConsumptions,
  getConsumptionById,
  getConsumptionBySection,
  createConsumption,
  updateConsumptionById,
  deleteConsumptionById,
} = require("../../controllers/consumption.controller");

const {authenticateToken} = require("../../middlewares/authenticate");


// Define routes using router.route for Kitchen Consumptions
router
  .route("/")
  .get(authenticateToken,getAllConsumptions)
  .post(authenticateToken,createConsumption);

router
  .route("/:id")
  .get(authenticateToken,getConsumptionById)
  .put(authenticateToken,updateConsumptionById)
  .delete(authenticateToken,deleteConsumptionById);

router
  .route("/bysection/:sectionId")
  .get(authenticateToken,getConsumptionBySection)

module.exports = router;
