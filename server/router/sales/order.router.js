import express from "express";
const router = express.Router();
import { authenticateToken } from "../../middlewares/authenticate.js";


import {
  createOrder,
  getOrder,
  getOrders,
  getLimitOrders,
  updateOrder,
  deleteOrder,
} from "../../controllers/sales/Order.controller.js";

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
export default router;
