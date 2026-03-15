import express from "express";
const router = express.Router();
import {
  getAllConsumptions,
  getConsumptionById,
  getConsumptionBySection,
  createConsumption,
  updateConsumptionById,
  deleteConsumptionById,
} from "../../controllers/inventory/consumption.controller.js";

import {authenticateToken} from "../../middlewares/authenticate.js";


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

export default router;
