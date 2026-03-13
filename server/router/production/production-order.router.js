const router = require("express").Router();

const {
  createProductionOrder,
  getProductionOrders,
  getProductionOrdersByStore,
  getProductionOrdersByPreparationSection,
  getProductionOrder,
  updateProductionOrder,
  updateProductionStatus,
  deleteProductionOrder,
} = require("../../controllers/production-order.controller");

const { authenticateToken } = require("../../middlewares/authenticate");


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

module.exports = router;
