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
const checkSubscription = require("../../middlewares/checkSubscription");

// Create a new Production Order
router
  .route("/")
  .post(authenticateToken, checkSubscription, createProductionOrder)
  .get(authenticateToken, checkSubscription, getProductionOrders);

router
  .route("/:id")
  .get(authenticateToken, checkSubscription, getProductionOrder)
  .put(authenticateToken, checkSubscription, updateProductionOrder)
  .delete(authenticateToken, checkSubscription, deleteProductionOrder);

router
  .route("/store/:storeId")
  .get(authenticateToken, checkSubscription, getProductionOrdersByStore);

router
  .route("/section/:sectionId")
  .get(authenticateToken, checkSubscription, getProductionOrdersByPreparationSection);

router
  .route("/status/:id")
  .put(authenticateToken, checkSubscription, updateProductionStatus);

module.exports = router;
