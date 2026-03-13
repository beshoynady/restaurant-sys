import router from "express";.Router();

import {
  createProductionOrder,
  getProductionOrders,
  getProductionOrdersByStore,
  getProductionOrdersByPreparationSection,
  getProductionOrder,
  updateProductionOrder,
  updateProductionStatus,
  deleteProductionOrder,
} from "../../controllers/production-order.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


// Create a new Production Order
router
  .route("/")
  .post(authenticateToken,createProductionOrder)
  .get(authenticateToken,getProductionOrders);

router
  .route("/:id")
  .get(authenticateToken,getProductionOrder)
  .put(authenticateToken,updateProductionOrder)
  .delete(authenticateToken,deleteProductionOrder);

router
  .route("/store/:storeId")
  .get(authenticateToken,getProductionOrdersByStore);

router
  .route("/section/:sectionId")
  .get(authenticateToken,getProductionOrdersByPreparationSection);

router
  .route("/status/:id")
  .put(authenticateToken,updateProductionStatus);

export default router;
