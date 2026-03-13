const express = require("express");
const router = express.Router();
const {
  createCustomerMessage,
  getAllCustomerMessages,
  getCustomerMessageById,
  updateCustomerMessage,
  deleteCustomerMessage,
  softDeleteCustomerMessage,
  restoreCustomerMessage,
} = require("../../controllers/customers/message.controller");
// ----------------------------
// 🔹 Middlewares
// ----------------------------
const { authenticateToken } = require("../../middlewares/authenticate");


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

module.exports = router;
