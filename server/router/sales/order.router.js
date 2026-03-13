const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middlewares/authenticate");


const {
  createOrder,
  getOrder,
  getOrders,
  getLimitOrders,
  updateOrder,
  deleteOrder,
} = require("../../controllers/sales/Order.controller");

router
  .route("/")
  .post(createOrder)
  .get(getOrders);
router
  .route("/:id")
  .get(getOrder)
  .put(updateOrder)
  .delete(authenticateToken,deleteOrder);
router.route("/limit/:limit").get(getLimitOrders);
module.exports = router;
