import express from "express";
const router = express.Router();
import {
  createCustomerMessage,
  getAllCustomerMessages,
  getCustomerMessageById,
  updateCustomerMessage,
  deleteCustomerMessage,
  softDeleteCustomerMessage,
  restoreCustomerMessage,
} from "../../controllers/customers/message.controller.js";
// ----------------------------
// 🔹 Middlewares
// ----------------------------
import { authenticateToken } from "../../middlewares/authenticate.js";


router
  .route("/")
  .post(createCustomerMessage)
  .get(authenticateToken, getAllCustomerMessages);

router
  .route("/:id")
  .get(authenticateToken, getCustomerMessageById)
  .put(authenticateToken, updateCustomerMessage)
  .delete(authenticateToken, deleteCustomerMessage);
router
  .route("soft-delete/:id")
  .put(authenticateToken, softDeleteCustomerMessage);
router.patch(
  "/restore/:id",
  authenticateToken,
  
  restoreCustomerMessage,
);

export default router;
