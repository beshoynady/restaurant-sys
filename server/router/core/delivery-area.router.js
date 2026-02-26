const express = require("express");
const router = express.Router();
const {
  createDeliveryArea,
  getAllDeliveryAreas,
  getDeliveryAreaById,
  updateDeliveryArea,
  deleteDeliveryArea,
} = require("../controllers/delivery-area.controller");

const { authenticateToken } = require("../middlewares/authenticate");

router
  .route("/")
  .post(authenticateToken, checkSubscription, createDeliveryArea)
  .get(getAllDeliveryAreas);

router
  .route("/:id")
  .get(authenticateToken, checkSubscription, getDeliveryAreaById)
  .put(authenticateToken, checkSubscription, updateDeliveryArea)
  .delete(authenticateToken, checkSubscription, deleteDeliveryArea);

module.exports = router;
